from fastapi import APIRouter, HTTPException
from models import CodeSubmission, ReviewResultResponse
from services.ai_engine import analyze_code_with_ai
from services.static_analyzer import run_static_analysis
from services.concepts import PRACTICE_CONCEPTS
from pydantic import BaseModel
from typing import Optional, List
import subprocess, tempfile, os, sys, shutil, re

class RunRequest(BaseModel):
    code: str
    language: str
    stdin: Optional[str] = ""
    blind_spots: Optional[List[str]] = []
    is_practice: bool = False
    mode: Optional[str] = "standard"
    persona: Optional[str] = "standard"
    concept_id: Optional[str] = None
    user_id: Optional[str] = "anonymous"

router = APIRouter()
from database import supabase

# Removed in-memory history_db in favor of Supabase persistent storage

@router.get("/practice/concepts")
async def get_practice_concepts():
    """
    Returns available code practice concepts.
    """
    return PRACTICE_CONCEPTS

@router.post("/analyze", response_model=ReviewResultResponse)
async def analyze_code(submission: CodeSubmission):
    if not submission.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
        
    try:
        # 1. Run Static Analysis — catches syntax errors first
        static_feedback = run_static_analysis(submission.code, submission.language)

        # Check if a syntax error was found — if so, skip AI engine entirely
        has_syntax_error = any(
            f.get("type") == "error" and "Syntax Error" in f.get("message", "")
            for f in static_feedback
        )

        if has_syntax_error:
            # Return immediately with failing scores — no point in AI analysis
            result = ReviewResultResponse(
                language=submission.language,
                original_code=submission.code,
                refactored_code=submission.code,  # Can't refactor broken code
                scores={"quality": 0, "readability": 0, "performance": 0},
                feedback=static_feedback
            )
        else:
            # 2. Run AI/heuristic analysis on syntactically valid code
            ai_result = analyze_code_with_ai(submission.code, submission.language)
            merged_feedback = static_feedback + ai_result["feedback"]

            result = ReviewResultResponse(
                user_id=submission.user_id,
                language=submission.language,
                original_code=submission.code,
                refactored_code=ai_result["refactored_code"],
                scores=ai_result["scores"],
                feedback=merged_feedback,
                explanations=ai_result.get("explanations")
            )

        # 3. Save to Supabase (Persistence)
        try:
            db_data = result.dict()
            # Convert datetime to string for JSON serialization if necessary
            db_data["timestamp"] = db_data["timestamp"].isoformat()
            
            supabase.table("reviews").insert(db_data)
        except Exception as db_err:
            print(f"Database error (Review not saved): {db_err}")
            # We don't raise here so the user still gets their analysis result
            
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_history(user_id: str = "anonymous"):
    """
    Returns previous code reviews from Supabase, filtered by user.
    """
    try:
        filters = {"user_id": user_id}
        data = supabase.table("reviews").select("*", filters=filters)
        return {"history": data}
    except Exception as e:
        print(f"History fetch error: {e}")
        return {"history": [], "error": "Could not connect to database"}

import re

def interleave_output(stdout_str, stdin_str):
    """
    Cleans the output side by removing any text that looks like a prompt 
    (anything at the start of a line ending in : or ?) to ensure 
    it only shows up on the input side.
    """
    if not stdout_str: return ""
    
    # Heuristic: Remove common prompt patterns from the start of each line
    # Matches text from start of line up to a colon, question mark, or arrow.
    # Pattern: ^ [any text] [: or ? or >] [optional space]
    cleaned_lines = []
    for line in stdout_str.splitlines(keepends=True):
        # We only remove it if it's at the very beginning (typical for input() prompts)
        new_line = re.sub(r"^[ \t]*[^:\n\?]+(?::|\?|>)[ \t]*", "", line)
        if new_line.strip() or line.endswith('\n'):
            cleaned_lines.append(new_line)
            
    return "".join(cleaned_lines)

@router.post("/run")
async def run_code(request: RunRequest):
    code = request.code
    lang = request.language.lower()
    temp_path = None
    print(f"[RUN] Lang: {lang}, Input length: {len(request.stdin or '')}")
    
    # ── Basic Security Check ──────────────────────────────────────────────────
    dangerous_keywords = ["rm ", "del ", "format ", "os.system", "subprocess.", "shutil.", "eval(", "exec(", "sh ", "bash "]
    if any(kw in code for kw in dangerous_keywords):
         return {
            "stdout": "", 
            "stderr": "Security Violation:\nPotentially dangerous command detected. For security reasons, system calls and file system mutations are restricted.",
            "exit_code": 1
        }
    if lang == "python":
        cmd = [sys.executable]
        ext = ".py"
    elif lang == "javascript" or lang == "js":
        if not shutil.which("node"):
            raise HTTPException(status_code=500, detail="Node.js is not installed on the server.")
        cmd = ["node"]
        ext = ".js"
    elif lang == "java":
        # Check for obvious language mismatch (e.g. Python code in Java engine)
        # Refined mismatch detection (ensure we don't trip on System.out.print)
        is_definitely_python = (
            ("def " in code and ":" in code) or 
            ("elif " in code) or 
            ("print(" in code and "System.out.print" not in code)
        )
        if is_definitely_python:
            return {
                "stdout": "", 
                "stderr": "Engine Mismatch Error:\nIt looks like you are writing Python code, but the Java engine is active. Please switch to the Python engine.",
                "exit_code": 1
            }

        if not shutil.which("javac"):
            raise HTTPException(status_code=500, detail="Java compiler (javac) is not installed.")
        # Java needs a file matching its public class name. Let's find it.
        import re
        # Look for [public] class ClassName
        match = re.search(r"(?:public\s+)?class\s+(\w+)", code)
        class_name = match.group(1) if match else "Main"
        
        # Create a temp dir for Java compilation
        temp_dir = tempfile.mkdtemp()
        java_file = os.path.join(temp_dir, f"{class_name}.java")
        with open(java_file, "w", encoding="utf-8") as f:
            f.write(code)
        
        try:
            # Compile
            compile_proc = subprocess.run(["javac", java_file], capture_output=True, text=True, encoding="utf-8")
            if compile_proc.returncode != 0:
                shutil.rmtree(temp_dir)
                # Check if the error looks like a language mismatch
                err_msg = compile_proc.stderr
                if "class, interface, annotation type, enum, record, method or field expected" in err_msg:
                    err_msg += "\n\nTip: You might have selected the wrong language. This error often occurs when writing Python code in the Java engine."
                
                return {"stdout": "", "stderr": f"Compilation Error:\n{err_msg}", "exit_code": compile_proc.returncode}
            
            # Ensure stdin has a trailing newline for Java/C++ scannners
            stdin_payload = (request.stdin or "")
            if stdin_payload and not stdin_payload.endswith('\n'):
                stdin_payload += '\n'

            # Run
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            run_proc = subprocess.Popen(["java", "-cp", temp_dir, class_name], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", env=env)
            try:
                out, err = run_proc.communicate(input=stdin_payload, timeout=10)
            except subprocess.TimeoutExpired:
                run_proc.kill()
                out, err = run_proc.communicate()
                err += "\n\nError: Execution timed out after 10 seconds."
            
            shutil.rmtree(temp_dir)
            return {
                "stdout": interleave_output(out, request.stdin or ""),
                "stderr": err,
                "exit_code": run_proc.returncode
            }
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(status_code=500, detail=f"Java execution failed: {str(e)}")
            
        return {} # Should not reach here
    elif lang == "c++" or lang == "cpp" or lang == "c":
        compiler = "g++" if "++" in lang or "cpp" in lang else "gcc"
        if not shutil.which(compiler):
            raise HTTPException(status_code=500, detail=f"{compiler} is not installed.")
        
        temp_dir = tempfile.mkdtemp()
        ext = ".cpp" if "++" in lang or "cpp" in lang else ".c"
        source_file = os.path.join(temp_dir, f"main{ext}")
        exe_file = os.path.join(temp_dir, "main.exe" if os.name == 'nt' else "main")
        
        with open(source_file, "w", encoding="utf-8") as f:
            f.write(code)
            
        try:
            # Compile
            compile_proc = subprocess.run([compiler, source_file, "-o", exe_file], capture_output=True, text=True, encoding="utf-8")
            if compile_proc.returncode != 0:
                shutil.rmtree(temp_dir)
                return {"stdout": "", "stderr": f"Compilation Error:\n{compile_proc.stderr}", "exit_code": compile_proc.returncode}
            
            # Run
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            run_proc = subprocess.Popen([exe_file], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", env=env)
            try:
                out, err = run_proc.communicate(input=request.stdin or "", timeout=10)
            except subprocess.TimeoutExpired:
                run_proc.kill()
                out, err = run_proc.communicate()
                err += "\n\nError: Execution timed out after 10 seconds."
            
            shutil.rmtree(temp_dir)
            return {
                "stdout": interleave_output(out, request.stdin or ""),
                "stderr": err,
                "exit_code": run_proc.returncode
            }
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(status_code=500, detail=f"{lang.upper()} execution failed: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail=f"Execution for language {lang} is not supported yet.")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False, mode='w', encoding='utf-8') as f:
        f.write(code)
        temp_path = f.name

    try:
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        proc = subprocess.Popen(cmd + [temp_path], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", env=env)
        try:
            out, err = proc.communicate(input=request.stdin or "", timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            out, err = proc.communicate()
            err += "\n\nError: Execution timed out after 10 seconds."

        return {
            "stdout": interleave_output(out, request.stdin or ""),
            "stderr": err,
            "exit_code": proc.returncode
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute code: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/practice/evaluate")
async def evaluate_practice(request: RunRequest):
    # Generic mentor evaluation across all languages
    code = request.code
    lang = request.language.lower()
    mode = request.mode.lower()
    persona = request.persona.lower()

    
    # Map js to javascript
    if lang == "js": lang = "javascript"
    if lang == "c++": lang = "cpp"
    
    # Detect obvious language mismatch (e.g. Python code but lang is Java)
    is_python_looking = "input(" in code or "print(" in code or "def " in code
    is_java_looking = "System.out.println" in code or "public class" in code
    
    if lang == "java" and is_python_looking and not is_java_looking:
        return {
            "status": "fail",
            "message": "Engine Mismatch: You have 'Java' selected but your code looks like Python.",
            "mistakes": ["Selected engine: Java", "Detected syntax: Python"],
            "fixed_code": code,
            "alternative": "Please switch the language dropdown to 'Python' to get accurate practice results."
        }

    # 1. Run static analysis to detect syntax errors
    static_feedback = run_static_analysis(code, lang)
    mistakes = [f["message"] for f in static_feedback if f.get("type") in ("error", "warning")]
    has_syntax_error = any(f.get("type") == "error" for f in static_feedback)
    
    if has_syntax_error or len(mistakes) > 0:
        return {
            "status": "fail",
            "message": f"We detected some issues with your {lang.capitalize()} code. Please review the mistakes below.",
            "mistakes": mistakes,
            "fixed_code": code,
            "alternative": "Tip: Always check syntax rules specific to the language you are practicing."
        }
        
    # 2. If no static errors, check against basic AI engine
    try:
        ai_result = analyze_code_with_ai(code, lang)
        
        # Format the feedback into an array of strings
        ai_feedbacks = []
        for f in ai_result.get("feedback", []):
            if isinstance(f, dict) and "message" in f:
                if mode == "red_team" and f["type"] == "error":
                     # Prioritize red team exploit messages
                     ai_feedbacks.insert(0, f["message"])
                else:
                     ai_feedbacks.append(f["message"])
            elif isinstance(f, str):
                ai_feedbacks.append(f)
                
        alternative_text = "Your logic looks optimal for this scope!"
        if ai_feedbacks:
            alternative_text = "Here are some generic thoughts or improvements:\n" + "\n".join(ai_feedbacks)
            
        fixed_code_result = ai_result.get("refactored_code", code)
        status_msg = f"Great job! Your {lang.capitalize()} code looks solid and has no static errors."
        
        # Use AI-suggested alternative if available, otherwise fallback
        alternative_text = ai_result.get("alternative", "Your logic looks optimal for this scope!")

        if mode == "socratic":
            fixed_code_result = "HIDDEN. Socratic mode prevents revealing the full refactored code."
            alternative_text = "SOCRATIC MENTOR:\n"
            if len(ai_feedbacks) == 0:
                alternative_text += "Code looks good. What are the edge cases for this logic?"
            else:
                for f in ai_feedbacks:
                    alternative_text += f"I noticed an issue: {f} How would you refactor this to be cleaner or safer?\n"
        
        elif mode == "code_golf":
            lines = [l for l in code.splitlines() if l.strip()]
            line_count = len(lines)
            if line_count <= 5:
                status_msg = f"Incredible! You solved this in just {line_count} lines! True Code Golf Mastery."
                ai_feedbacks = ["You kept the AST node footprint incredibly small."]
            else:
                status_msg = f"Too long! Your code took {line_count} lines. Can you do it in 5 lines or fewer?"
                ai_feedbacks.insert(0, "Try using list comprehensions or ternary operators.")
        
        elif mode == "chaos_monkey":
            import random
            mutations = {" + ": " - ", " - ": " + ", " > ": " >= ", " < ": " <= ", " == ": " != "}
            mutated_code = code
            possible_muts = [k for k in mutations.keys() if k in code]
            if possible_muts:
                target = random.choice(possible_muts)
                mutated_code = mutated_code.replace(target, mutations[target], 1)
                
            status_msg = "CHAOS MONKEY HAS STRUCK!"
            ai_feedbacks = ["I successfully sneaked a microscopic bug into your code. Can you find the exact logic operator I changed?"]
            fixed_code_result = mutated_code
            alternative_text = "Good luck playing detective! Copy the corrected code back into your editor to run it."
            
        if persona == "linus":
            status_msg = "LINUS MODE: Your code works, but frankly, it's a mess. 🐧"
            if len(ai_feedbacks) == 0:
                alternative_text = "Miraculously, I have no complaints. Merge it."
            else:
                alternative_text = "Why do you write code like this? Fix the following instantly:\n" + "\n".join(ai_feedbacks)
        elif persona == "zen":
            status_msg = "ZEN MASTER MODE: The data flows, the syntax compiles. 🌸"
            if len(ai_feedbacks) == 0:
                alternative_text = "Your logic is at peace with the machine. Breathe."
            else:
                alternative_text = "Consider finding balance by resolving these ripples in your code:\n" + "\n".join(ai_feedbacks)
        elif persona == "startup":
            status_msg = "STARTUP BRO MODE: LGTM, ship it! We need to hit 1M MRR. 🚀"
            alternative_text = "Who cares about technical debt? We'll refactor it when we raise our Series A. Ship it!"

        result_data = {
            "status": "success",
            "message": status_msg,
            "mistakes": ai_feedbacks,
            "fixed_code": fixed_code_result,
            "alternative": alternative_text,
            "explanations": ai_result.get("explanations"),
            "vibe": ai_result.get("vibe"),
            "blind_spots": ai_result.get("blind_spots")
        }

        # 3. Save to Supabase (Persistence)
        try:
            # We construct a ReviewResultResponse to match the schema
            db_entry = ReviewResultResponse(
                user_id=request.user_id,
                language=lang,
                original_code=code,
                refactored_code=fixed_code_result,
                scores=ai_result.get("scores", {"quality": 80, "readability": 80, "performance": 80}),
                feedback=[{"line": None, "type": "suggestion", "message": m, "suggestion": ""} for m in ai_feedbacks],
                explanations=ai_result.get("explanations"),
                vibe=ai_result.get("vibe"),
                blind_spots=ai_result.get("blind_spots"),
                is_practice=True
            )
            db_data = db_entry.dict()
            db_data["timestamp"] = db_data["timestamp"].isoformat()
            supabase.table("reviews").insert(db_data)
        except Exception as db_err:
            print(f"Database error (Practice not saved): {db_err}")

        return result_data

    except Exception as e:
        return {
            "status": "success",
            "message": f"Compiled and ran successfully, but mentor analysis skipped due to error: {str(e)}",
            "mistakes": [],
            "fixed_code": code,
            "alternative": "No alternative suggestions available."
        }

@router.post("/practice/complexity")
async def analyze_complexity(request: RunRequest):
    code = request.code
    lang = request.language.lower()
    comp = "O(1)"
    carbon = "0.01g CO₂ / 10k ops"
    
    if "for " in code or "while " in code:
        comp = "O(N)"
        carbon = "0.45g CO₂ / 100k ops"
        if "for " in code:
             blocks = code.split("for ")
             for i in range(1, len(blocks)):
                 if "for " in blocks[i] or "while " in blocks[i]:
                     comp = "O(N²)"
                     carbon = "2.80g CO₂ / 1m ops 🌳(Warning!)"
                     break
                 
    return {"complexity": comp, "carbon": carbon}
