from sqlalchemy.orm import Session
from typing import Dict, Optional
from app.models.category_feedback import CategoryFeedback

def record_category_feedback(
    db: Session,
    user_id: int,
    transaction_id: Optional[int],
    raw_narration: str,
    old_category: Optional[str],
    new_category: str
) -> CategoryFeedback:
    """Record user category correction for continuous prompt and rule enrichment."""
    feedback = CategoryFeedback(
        user_id=user_id,
        transaction_id=transaction_id,
        raw_narration=raw_narration,
        old_category=old_category,
        new_category=new_category
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

def get_learned_category_mappings(db: Session, user_id: int) -> Dict[str, str]:
    """Retrieves user-specific narration -> category overrides learned from past feedback."""
    feedbacks = db.query(CategoryFeedback).filter(CategoryFeedback.user_id == user_id).order_by(CategoryFeedback.created_at.asc()).all()
    mapping = {}
    for fb in feedbacks:
        clean_text = fb.raw_narration.strip().lower()
        if clean_text:
            mapping[clean_text] = fb.new_category
    return mapping
