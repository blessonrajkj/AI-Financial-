from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from decimal import Decimal
import json

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.chat_history import ChatHistory
from app.models.voice_log import VoiceLog
from app.models.transaction import Transaction
from app.models.category_merchant import Category, Merchant
from app.services.chatbot_service import chatbot_service
from app.services.voice_parser import voice_parser
from app.services.ml_categorizer import ml_categorizer
from app.schemas.misc import ChatQuery, ChatResponse, VoiceTranscript, VoiceLogOut, VoiceTransactionConfirm

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_with_finny(
    query_in: ChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    try:
        reply = chatbot_service.get_chat_response(db, current_user.id, query_in.query)
        
        # Save to DB
        chat_entry = ChatHistory(
            user_id=current_user.id,
            query=query_in.query,
            response=reply
        )
        db.add(chat_entry)
        db.commit()
        db.refresh(chat_entry)
        
        return chat_entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice-entry")
def parse_voice_transaction(
    transcript_in: VoiceTranscript,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    try:
        parsed_result = voice_parser.parse_transcript(transcript_in.transcript, db)
        
        # Log voice entry
        voice_log = VoiceLog(
            user_id=current_user.id,
            transcript=transcript_in.transcript,
            parsed_json=json.dumps({
                "amount": parsed_result["amount"],
                "merchant_name": parsed_result["merchant_name"],
                "category_name": parsed_result["category_name"]
            })
        )
        db.add(voice_log)
        db.commit()
        db.refresh(voice_log)
        
        return {
            "voice_log_id": voice_log.id,
            "amount": parsed_result["amount"],
            "merchant_name": parsed_result["merchant_name"],
            "category_name": parsed_result["category_name"],
            "description": parsed_result["description"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice-entry/confirm", status_code=status.HTTP_201_CREATED)
def confirm_voice_transaction(
    payload: VoiceTransactionConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Verify voice log
    log = db.query(VoiceLog).filter(
        VoiceLog.id == payload.voice_log_id, VoiceLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Voice transcript log not found")
        
    # Find or create category (scoped to user or global defaults, escaping SQL wildcards)
    escaped_cat = payload.category_name.replace("%", "\\%").replace("_", "\\_")
    category = db.query(Category).filter(
        Category.name.ilike(escaped_cat),
        or_(Category.user_id.is_(None), Category.user_id == current_user.id)
    ).first()
    if not category:
        category = Category(name=payload.category_name, type="expense", user_id=current_user.id)
        db.add(category)
        db.commit()
        db.refresh(category)
        
    # Find or create merchant (scoped to user or global defaults, escaping SQL wildcards)
    escaped_merch = payload.merchant_name.replace("%", "\\%").replace("_", "\\_")
    merchant = db.query(Merchant).filter(
        Merchant.name.ilike(escaped_merch),
        or_(Merchant.user_id.is_(None), Merchant.user_id == current_user.id)
    ).first()
    if not merchant:
        merchant = Merchant(name=payload.merchant_name, user_id=current_user.id, default_category_id=category.id)
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
        
    # Save transaction
    transaction = Transaction(
        user_id=current_user.id,
        amount=Decimal(str(payload.amount)),
        date=datetime.now(),
        description=payload.description,
        category_id=category.id,
        merchant_id=merchant.id,
        type="expense",
        voice_log_id=log.id
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Retrain categorizer dynamically
    ml_categorizer.train_model(db)
    
    return transaction

@router.get("/insights")
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Run insight query analysis
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense"
    ).all()
    
    if not transactions:
        return {
            "insights": ["You need to log at least a few transactions for AI to analyze spending patterns."],
            "recommendations": ["Try uploading a receipt or logging your first expense."]
        }
        
    insights = []
    recommendations = []
    
    # Calculate spending parameters
    amounts = [Decimal(str(t.amount)) for t in transactions]
    total_spent = sum(amounts)
    avg_spent = total_spent / len(transactions)
    largest_transaction = max(transactions, key=lambda x: Decimal(str(x.amount)))
    
    insights.append(f"Your average purchase size is ₹{round(avg_spent, 2)}.")
    insights.append(f"Your largest recent expense was ₹{largest_transaction.amount} on {largest_transaction.date.strftime('%Y-%m-%d')} for {largest_transaction.merchant.name if largest_transaction.merchant else 'Unknown'}.")
    
    # Analyze weekend vs weekday spending
    weekend_sum = Decimal("0")
    weekday_sum = Decimal("0")
    weekend_count = 0
    weekday_count = 0
    for t in transactions:
        t_amt = Decimal(str(t.amount))
        if t.date.weekday() >= 5:  # 5, 6 is Saturday, Sunday
            weekend_sum += t_amt
            weekend_count += 1
        else:
            weekday_sum += t_amt
            weekday_count += 1
            
    avg_weekend = weekend_sum / weekend_count if weekend_count > 0 else Decimal("0")
    avg_weekday = weekday_sum / weekday_count if weekday_count > 0 else Decimal("0")
    
    if avg_weekend > avg_weekday * Decimal("1.3"):
        insights.append(f"Weekend spending alert: Your weekend purchases average ₹{round(avg_weekend, 2)}, which is 30%+ higher than your weekdays.")
        recommendations.append("Consider setting a separate weekend budget constraint to manage leisure spending.")

    # High frequency microtransactions
    micro_trans = [t for t in transactions if Decimal(str(t.amount)) < Decimal("500.0")]
    if len(micro_trans) >= 5:
        micro_sum = sum(Decimal(str(t.amount)) for t in micro_trans)
        insights.append(f"Frequent small transactions: You made {len(micro_trans)} purchases under ₹500, totaling ₹{round(micro_sum, 2)}.")
        recommendations.append("Check recurring microtransactions (like coffees or small utility bills) that can add up quietly over the month.")

    # General wealth building recommendations
    recommendations.append("Build an emergency fund covering at least 3-6 months of essential living expenses.")
    recommendations.append("Automate 10% of your salary into equity investments or stable indices on pay day.")
    
    return {
        "insights": insights,
        "recommendations": recommendations
    }
