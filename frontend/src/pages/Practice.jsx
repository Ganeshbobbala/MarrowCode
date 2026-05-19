import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Check, AlertCircle, AlertTriangle, BookOpen, Lightbulb, Code2,
  Sparkles, Terminal, ChevronDown, Bot, GitBranch, Plus,
  Trophy, Zap, ShieldCheck, HelpCircle, Layers, Clock, Loader2, Maximize2, Minimize2, Trash2, Crown, FastForward, History as HistoryIcon, User, Globe, RotateCcw
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import API_BASE from '../api_config';
import mermaid from 'mermaid';
import aiMentorImg from '../assets/ai_mentor.png';
import { getUserId } from '../utils/user';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif'
});

const Mermaid = ({ chart }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && chart) {
      const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      ref.current.innerHTML = `<div class="mermaid" id="${uniqueId}">${chart}</div>`;
      try {
        mermaid.contentLoaded();
        mermaid.init(undefined, ref.current.getElementsByClassName('mermaid'));
      } catch (e) {
        console.error("Mermaid error:", e);
      }
    }
  }, [chart]);

  return <div ref={ref} className="flex justify-center p-4 bg-slate-900/80 rounded-xl border border-indigo-500/20 overflow-x-auto my-4 transition-all hover:border-indigo-500/40" />;
};


const BOILERPLATES = {
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Practice!");\n    }\n}`,
  python: `def main():\n    print("Hello, Practice!")\n\nif __name__ == "__main__":\n    main()`,
  javascript: `console.log("Hello, Practice!");`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, Practice!" << endl;\n    return 0;\n}`,
  c: `#include <stdio.h>\nint main() {\n    printf("Hello, Practice!\\n");\n    return 0;\n}`
};

const Practice = () => {
  const [language, setLanguage] = useState('python');
  const [mode] = useState('standard');
  const [persona, setPersona] = useState('standard');
  const [code, setCode] = useState("");
  const [output, setOutput] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complexity] = useState('O(1)');
  const [concepts, setConcepts] = useState([]);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [stdin, setStdin] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileData, setNewFileData] = useState({ name: '', language: 'python' });
  const [showHint, setShowHint] = useState(true);

  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem('practice_files');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Main.py', content: BOILERPLATES.python, language: 'python' }
    ];
  });
  const [activeFileId, setActiveFileId] = useState(() => {
    const saved = localStorage.getItem('practice_active_file_id');
    return saved ? parseInt(saved) : 1;
  });

  useEffect(() => {
    localStorage.setItem('practice_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('practice_active_file_id', activeFileId.toString());
  }, [activeFileId]);

  const [activeTab, setActiveTab] = useState('code');
  // We'll keep insights on the right and console at the bottom
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  useEffect(() => {
    axios.get(`${API_BASE}/practice/concepts`)
      .then(res => {
        setConcepts(res.data);
        if (res.data.length > 0 && !selectedConcept) {
          setSelectedConcept(res.data[0]);
        }
      })
      .catch(err => console.error("Concepts fetch failed", err));
  }, [selectedConcept]);

  useEffect(() => {
    if (!selectedConcept && concepts.length > 0) {
      setSelectedConcept(concepts[0]);
    }
  }, [concepts, selectedConcept]);

  useEffect(() => {
    // Sync language state when active file changes
    if (activeFile) {
      setLanguage(activeFile.language);
      setCode(activeFile.content);
    }
  }, [activeFileId, activeFile]);

  const insightsRef = useRef(null);

  useEffect(() => {
    if (evalResult && insightsRef.current) {
      insightsRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [evalResult]);

  // Update file content when code changes in editor
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newCode } : f));
  };

  const [editingFileId, setEditingFileId] = useState(null);
  const [tempFileName, setTempFileName] = useState("");

  const startRenaming = (file) => {
    setEditingFileId(file.id);
    setTempFileName(file.name);
  };

  const finishRenaming = () => {
    if (tempFileName.trim()) {
      setFiles(prev => prev.map(f => f.id === editingFileId ? { ...f, name: tempFileName.trim() } : f));
    }
    setEditingFileId(null);
  };

  const createNewFile = () => {
    if (!newFileData.name.trim()) return;
    
    const newId = Math.max(...files.map(f => f.id), 0) + 1;
    const extensions = { python: 'py', java: 'java', javascript: 'js', cpp: 'cpp', c: 'c' };
    const ext = extensions[newFileData.language] || 'txt';
    const fileName = newFileData.name.includes('.') ? newFileData.name : `${newFileData.name}.${ext}`;
    
    const newFile = {
      id: newId,
      name: fileName,
      content: BOILERPLATES[newFileData.language] || "",
      language: newFileData.language
    };
    
    setFiles([...files, newFile]);
    setActiveFileId(newId);
    setShowNewFileModal(false);
    setNewFileData({ name: '', language: 'python' });
  };

  const deleteFile = (id) => {
    if (files.length <= 1) return;
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (activeFileId === id) setActiveFileId(newFiles[0].id);
  };

  const runCode = async () => {
    setIsSubmitting(true);
    setEvalResult(null);
    try {
      // 1. Run the code
      const userId = getUserId();
      const runRes = await axios.post(`${API_BASE}/run`, {
        code,
        language: language.toLowerCase(),
        stdin,
        user_id: userId
      });
      setOutput(runRes.data);

      // 2. Perform AI evaluation (separated to prevent eval failure from hiding output)
      try {
        const evalRes = await axios.post(`${API_BASE}/practice/evaluate`, {
          code,
          language: language.toLowerCase(),
          mode, persona, stdin,
          concept_id: selectedConcept?.id,
          user_id: userId
        });
        setEvalResult(evalRes.data);
      } catch (evalErr) {
        console.error("Evaluation failed:", evalErr);
        // We don't overwrite output here; evalResult stays null or shows partial error in UI if needed
        setEvalResult({ 
          status: "error", 
          message: "Mentor analysis currently unavailable. Execution succeeded.",
          mistakes: ["AI Evaluation Error: " + (evalErr.response?.data?.detail || "Network Timeout")]
        });
      }
    } catch (runErr) {
      console.error("Run failed:", runErr);
      setOutput({ stderr: "Execution Error: " + (runErr.response?.data?.detail || "Could not reach server") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-120px)] animate-in fade-in duration-700 pb-10 lg:pb-0 overflow-visible lg:overflow-hidden">
      
      {/* 1. LEFT SIDEBAR: Explorer */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0 h-auto lg:h-full">
        
        {/* Explorer */}
        <div className="h-full bg-surface/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden backdrop-blur-md border-r border-indigo-500/10">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Layers size={14} className="text-primary" /> Explorer
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (window.confirm("Reset workspace? All files will be deleted.")) {
                    localStorage.removeItem('practice_files');
                    localStorage.removeItem('practice_active_file_id');
                    window.location.reload();
                  }
                }}
                className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-all"
                title="Reset Workspace"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setShowNewFileModal(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-primary transition-all hover:scale-110 active:scale-95 flex items-center gap-1"
                title="Create New File"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          
          {/* Hint Section */}
          {showHint && (
            <div className="mx-2 mt-2 p-3 bg-primary/10 border border-primary/20 rounded-xl relative animate-in slide-in-from-top-2">
              <button 
                onClick={() => setShowHint(false)}
                className="absolute top-1 right-1 text-slate-500 hover:text-white"
              >
                ×
              </button>
              <div className="flex items-start gap-2">
                <HelpCircle size={14} className="text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                  <span className="text-white font-bold">Pro Tip:</span> Create multiple files to practice different concepts simultaneously. Use the <Zap size={8} className="inline text-amber-400" /> Submit button to analyze your code!
                </p>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {files.map(file => (
              <div
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all border ${activeFileId === file.id
                    ? 'bg-primary/20 border-primary/30 text-white shadow-lg'
                    : 'hover:bg-white/5 text-slate-400 border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${file.language === 'python' ? 'bg-amber-400 shadow-amber-400/20' :
                      file.language === 'java' ? 'bg-rose-400 shadow-rose-400/20' :
                        'bg-blue-400 shadow-blue-400/20'
                    }`} />

                  {editingFileId === file.id ? (
                    <input
                      autoFocus
                      value={tempFileName}
                      onChange={e => setTempFileName(e.target.value)}
                      onBlur={finishRenaming}
                      onKeyDown={e => e.key === 'Enter' && finishRenaming()}
                      className="bg-slate-900 border border-primary/30 outline-none text-[11px] font-bold text-white px-2 py-0.5 rounded w-full shadow-inner"
                    />
                  ) : (
                    <span className="text-[11px] font-medium truncate">{file.name}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startRenaming(file); }}
                    className="hover:text-primary transition-colors p-1"
                    title="Rename"
                  >
                    <Lightbulb size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                    className="hover:text-rose-400 transition-colors p-1"
                    title="Delete"
                  >
                    <AlertCircle size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: Editor (Top) + Console (Bottom) */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-auto lg:h-full">
        
        {/* Editor Section */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Top bar for Editor */}
          <div className="bg-surface/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between backdrop-blur-sm px-5">
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 bg-slate-900/50 border border-white/5 rounded-lg px-3 py-1.5 focus-within:ring-1 ring-primary transition-all">
                <Code2 size={16} className="text-primary" />
                <select
                  value={language}
                  onChange={e => {
                    const newLang = e.target.value;
                    setLanguage(newLang);
                    setFiles(prev => prev.map(f => {
                      if (f.id === activeFileId) {
                        const oldBoilerplate = BOILERPLATES[f.language] || "";
                        if (f.content === oldBoilerplate || !f.content.trim()) {
                          return { ...f, language: newLang, content: BOILERPLATES[newLang] || "" };
                        }
                        return { ...f, language: newLang };
                      }
                      return f;
                    }));
                  }}
                  className="bg-transparent border-none text-sm font-bold text-slate-200 outline-none cursor-pointer appearance-none pr-4"
                >
                  <option value="python" className="bg-slate-900 text-white">Python</option>
                  <option value="java" className="bg-slate-900 text-white">Java</option>
                  <option value="javascript" className="bg-slate-900 text-white">JS</option>
                  <option value="cpp" className="bg-slate-900 text-white">C++</option>
                  <option value="c" className="bg-slate-900 text-white">C</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/50 border border-white/5 rounded-lg px-3 py-1.5 focus-within:ring-1 ring-primary transition-all">
                <Bot size={16} className="text-rose-400" />
                <select
                  value={persona}
                  onChange={e => setPersona(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-slate-200 outline-none cursor-pointer appearance-none pr-4"
                >
                  <option value="standard" className="bg-slate-900 text-white">Standard AI</option>
                  <option value="linus" className="bg-slate-900 text-white">Linus Mode</option>
                  <option value="zen" className="bg-slate-900 text-white">Zen Master</option>
                  <option value="startup" className="bg-slate-900 text-white">Startup Bro</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Est. Efficiency</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{complexity}</span>
              </div>
              <button
                onClick={runCode}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primaryHover disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Submit
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative group min-h-[300px]">
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <span className="bg-indigo-600/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black border border-white/20 uppercase tracking-widest text-white flex items-center gap-1 shadow-lg">
                <Zap size={10} fill="currentColor" /> {language.toUpperCase()} ENGINE ACTIVE
              </span>
            </div>
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              loading={<div className="flex items-center justify-center h-full text-indigo-400 animate-pulse font-bold tracking-widest text-xs">INITIALIZING ENGINE...</div>}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 20, bottom: 20 },
                fontFamily: 'JetBrains Mono, monospace',
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: true,
                automaticLayout: true,
                wordWrap: 'on',
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  useShadows: false,
                  verticalHasArrows: false,
                  horizontalHasArrows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10
                }
              }}
            />
          </div>
        </div>

        {/* Console Section (Bottom) */}
        <div className="h-[280px] bg-surface/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-row shrink-0 shadow-2xl">
          <div className="flex-1 flex flex-col border-r border-white/5">
            <div className="p-2 border-b border-white/5 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
              <Terminal size={12} /> Input Stream
            </div>
            <textarea
              className="flex-1 bg-black/20 p-4 text-xs font-mono text-amber-200 outline-none resize-none placeholder-slate-800"
              placeholder="Feed data to stdin..."
              value={stdin}
              onChange={e => setStdin(e.target.value)}
            />
          </div>
          <div className="flex-[3] flex flex-col">
            <div className="p-2 border-b border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
              <div className="flex items-center gap-2"><Zap size={12} className="text-amber-500" /> System Output</div>
              {output && (
                <span className={`px-2 py-0.5 rounded ${output.exit_code === 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                  EXIT {output.exit_code}
                </span>
              )}
            </div>
            <div className="flex-1 p-4 text-xs font-mono overflow-y-auto whitespace-pre-wrap bg-black/40 custom-scrollbar">
              {isSubmitting && <div className="text-indigo-400 animate-pulse font-bold italic">Executing code...</div>}
              {output?.stdout && <div className="text-slate-300">{output.stdout}</div>}
              {output?.stderr && <div className="text-rose-400/90">{output.stderr}</div>}
              {!output && !isSubmitting && <div className="text-slate-800 italic">System idle.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR: AI Insights */}
      <div className="w-full lg:w-[450px] flex flex-col gap-4 shrink-0 h-auto lg:h-full">
        <div className="h-full bg-surface/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-black/20">
            <Sparkles size={14} className="text-primary" />
            <div className="text-[10px] font-black uppercase tracking-widest text-white">AI Insights</div>
          </div>
          
          <div 
            ref={insightsRef}
            className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar animate-in slide-in-from-right-4 duration-500"
          >
            {/* Logic Mission */}
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden group">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-indigo-400" />
                <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Logic Mission</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-bold">
                Goal: {activeFile.content.toLowerCase().includes('even') ? "Mastering Even/Odd Logic." : 
                      activeFile.content.toLowerCase().includes('age') ? "Mastering Eligibility Gates." : 
                      activeFile.content.toLowerCase().includes('fact') ? "Optimizing Recursive Factorials." :
                      activeFile.content.toLowerCase().includes('for') ? "Enhancing Iteration Efficiency." :
                      activeFile.content.toLowerCase().includes('class') ? "Architecting OOP Structures." :
                      "Perfecting Custom Logic Architecture."}
              </p>
              <div className="mt-3 pt-3 border-t border-indigo-500/20 flex gap-2">
                <HelpCircle size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  <span className="text-white font-bold not-italic">What is this?</span> MarroeCode analyzes your code to define a <span className="text-indigo-300">Logic Mission</span>. This helps you focus on specific architectural goals like optimizing performance or mastering complex conditionals.
                </p>
              </div>
            </div>
            {isSubmitting && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
                <Loader2 size={40} className="text-primary animate-spin" />
                <p className="text-slate-400 text-[11px] font-bold animate-pulse">AI Mentor is analyzing your architecture...</p>
              </div>
            )}

            {!evalResult && !isSubmitting && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4 opacity-30">
                <Bot size={40} className="text-indigo-500" />
                <p className="text-slate-500 text-[11px] font-bold">Submit your code to activate the AI Mentor.</p>
              </div>
            )}

            {evalResult && (
              <div className="space-y-6">
                
                {/* 1. Code Vibe Analysis */}
                {evalResult.vibe && (
                  <div className={`bg-${evalResult.vibe.color}-500/10 border border-${evalResult.vibe.color}-500/20 rounded-2xl p-4 relative overflow-hidden`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {evalResult.vibe.icon === 'ShieldCheck' && <ShieldCheck size={14} className="text-emerald-400" />}
                        {evalResult.vibe.icon === 'AlertCircle' && <AlertCircle size={14} className="text-amber-400" />}
                        {evalResult.vibe.icon === 'Clock' && <Clock size={14} className="text-rose-400" />}
                        {evalResult.vibe.icon === 'Crown' && <Crown size={14} className="text-primary" />}
                        {evalResult.vibe.icon === 'Zap' && <Zap size={14} className="text-indigo-400" />}
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Code Vibe: {evalResult.vibe.mood}</h3>
                      </div>
                      <div className={`w-2 h-2 rounded-full bg-${evalResult.vibe.color}-500 animate-pulse`} />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      {evalResult.vibe.reason}
                    </p>
                  </div>
                )}

                {/* 2. Blind Spot Discovery */}
                {evalResult.blind_spots && evalResult.blind_spots.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={14} className="text-rose-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Blind Spots Detected</h3>
                    </div>
                    <div className="space-y-2">
                      {evalResult.blind_spots.map((spot, i) => (
                        <div key={i} className="flex gap-2 items-start bg-black/20 p-2 rounded-lg border border-white/5">
                          <span className="text-rose-400 text-[10px] font-bold">#0{i+1}</span>
                          <p className="text-[10px] text-slate-300 leading-tight">{spot}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Mentor Response & Time Travel */}
                <div className="bg-surface/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase text-[9px] tracking-widest px-1">
                      <Bot size={14} /> Mentor Analysis
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${evalResult.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {evalResult.status}
                    </span>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                      {evalResult.message}
                    </div>

                  </div>
                </div>

                {/* AI Mentor Image */}
                {evalResult.mistakes && evalResult.mistakes.length > 0 && (
                  <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative group">
                    <img src={aiMentorImg} alt="AI Mentor" className="w-full h-40 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Logic Analysis Active</span>
                    </div>
                  </div>
                )}

                {/* Recommended Refactoring (Replaced Mistakes) */}
                {evalResult.alternative && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase text-[9px] tracking-widest px-1">
                      <Sparkles size={14} /> Recommended Refactoring
                    </div>
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl">
                      <div className="p-4 bg-indigo-500/10 border-b border-indigo-500/10">
                        <p className="text-[11px] text-indigo-200 font-bold leading-relaxed italic">
                          "{evalResult.alternative.split('```')[0].trim()}"
                        </p>
                      </div>
                      {evalResult.alternative.includes('```') ? (
                        <div className="p-4 bg-black/40 font-mono text-[11px] text-emerald-400 overflow-x-auto custom-scrollbar">
                          <pre className="leading-relaxed">
                            {evalResult.alternative.split('```')[1]?.replace(/^[a-z]+\n/, '') || 'Logic optimization suggested.'}
                          </pre>
                        </div>
                      ) : (
                        <div className="p-4 bg-black/20 font-mono text-[11px] text-slate-300 italic">
                          <p>{evalResult.alternative}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Original Issues (Collapsed if Alternative exists) */}
                {evalResult.mistakes && evalResult.mistakes.length > 0 && !evalResult.alternative && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold uppercase text-[9px] tracking-widest px-1">
                      <AlertCircle size={14} /> Detected Issues
                    </div>
                    <div className="space-y-2">
                      {evalResult.mistakes.map((mistake, i) => (
                        <div key={i} className="flex gap-3 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <p className="text-slate-400 text-[11px] leading-relaxed">{mistake}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution Error */}
                {output?.stderr && (
                  <div className="space-y-3 animate-in shake duration-500">
                    <div className="flex items-center gap-2 text-rose-500 font-bold uppercase text-[9px] tracking-widest px-1">
                      <AlertTriangle size={14} /> Critical Error
                    </div>
                    <div className="bg-rose-950/30 border border-rose-500/20 p-4 rounded-xl backdrop-blur-md">
                      <p className="text-rose-300 font-mono text-[11px] leading-tight break-all">{output.stderr}</p>
                    </div>
                  </div>
                )}

                {/* Theoretical Foundation */}
                <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-700">
                  <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[9px] tracking-widest px-1">
                    <BookOpen size={14} className="text-emerald-400" /> Theoretical Foundation
                  </div>
                  <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl backdrop-blur-sm">
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {evalResult.theory || `This implementation utilizes ${language === 'python' ? 'list comprehensions and iterative loops' : 'nested loops and conditional branches'} to manage complex control flow. The O(n) complexity indicates a linear growth pattern, which is fundamental in algorithm design for processing sequential data structures.`}
                    </p>
                  </div>
                </div>

                {/* Real-World Application */}
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-700">
                  <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[9px] tracking-widest px-1">
                    <Globe size={14} className="text-blue-400" /> Real-World Utility
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl border-l-2 border-l-blue-500/40">
                    <p className="text-slate-300 text-[11px] leading-relaxed font-medium italic">
                      {evalResult.real_world || "Professional engineers use this logic in Data Pipelines, UI Rendering Engines, and Financial Modelling systems to ensure predictable state transitions and optimized memory management in production environments."}
                    </p>
                  </div>
                </div>

                {/* Execution Trace */}
                {evalResult.explanations?.line_by_line && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[9px] tracking-widest px-1">
                      <Layers size={14} /> Execution Trace
                    </div>
                    <div className="space-y-1.5">
                      {evalResult.explanations.line_by_line.map((step, i) => (
                        <div key={i} className="flex gap-3 items-center bg-slate-950/40 p-3 rounded-xl border border-white/5 transition-all hover:bg-slate-900/60">
                          <span className="text-[10px] font-mono text-slate-700 font-black min-w-[12px] text-center">{i + 1}</span>
                          <p className="text-slate-300 text-[11px] font-medium leading-none">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagram */}
                {evalResult.explanations?.diagram && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase text-[9px] tracking-widest px-1">
                      <GitBranch size={14} /> Logic Flow
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-2 overflow-hidden">
                      <Mermaid chart={evalResult.explanations.diagram} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* 4. MODALS */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Plus size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Create New File</h3>
                  <p className="text-xs text-slate-500 font-medium">Choose your workspace setup</p>
                </div>
              </div>
              <button onClick={() => setShowNewFileModal(false)} className="text-slate-500 hover:text-white transition-colors">
                ×
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">File Name</label>
                <input 
                  type="text"
                  placeholder="e.g. MyAlgorithm"
                  autoFocus
                  value={newFileData.name}
                  onChange={e => setNewFileData({...newFileData, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all font-mono shadow-inner"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Select Language</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'python', name: 'Python', color: 'text-amber-400', icon: 'py' },
                    { id: 'java', name: 'Java', color: 'text-rose-400', icon: 'java' },
                    { id: 'javascript', name: 'JS', color: 'text-yellow-400', icon: 'js' },
                    { id: 'cpp', name: 'C++', color: 'text-blue-400', icon: 'cpp' },
                    { id: 'c', name: 'C', color: 'text-slate-400', icon: 'c' }
                  ].map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => setNewFileData({...newFileData, language: lang.id})}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        newFileData.language === lang.id 
                        ? 'bg-primary/20 border-primary/40 text-white shadow-lg' 
                        : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <span className="text-xs font-bold">{lang.name}</span>
                      <span className={`text-[10px] font-mono font-black ${lang.color}`}>{lang.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-black/20 border-t border-white/5 flex gap-3">
              <button 
                onClick={() => setShowNewFileModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-white/5 text-slate-400 font-bold text-sm hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={createNewFile}
                disabled={!newFileData.name.trim()}
                className="flex-[2] bg-primary hover:bg-primaryHover disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.3); }
        .custom-scrollbar { scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        * { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default Practice;
