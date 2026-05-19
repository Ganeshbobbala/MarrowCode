from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

class CodeSubmission(BaseModel):
    code: str
    language: str
    user_id: Optional[str] = "anonymous"

class FeedbackItem(BaseModel):
    line: Optional[int]
    type: str
    message: str
    suggestion: str

class ScoreScores(BaseModel):
    quality: int
    readability: int
    performance: int

class AdvancedExplanations(BaseModel):
    line_by_line: List[str]
    logic_simplification: str
    real_world_use_case: str
    theoretical_concepts: List[str]
    diagram: Optional[str] = None

class CodeVibe(BaseModel):
    mood: str
    color: str
    icon: str
    reason: Optional[str] = None

class ReviewResultResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = "anonymous"
    language: str
    original_code: str
    refactored_code: str
    scores: ScoreScores
    feedback: List[FeedbackItem]
    explanations: Optional[AdvancedExplanations] = None
    vibe: Optional[CodeVibe] = None
    blind_spots: Optional[List[str]] = []
    is_practice: bool = False
