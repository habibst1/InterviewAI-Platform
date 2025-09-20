from pydantic import BaseModel

class EvaluationResult(BaseModel):
    score: int
    feedback: str