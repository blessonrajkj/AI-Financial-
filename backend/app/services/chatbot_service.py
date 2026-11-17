import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.core.config import settings
from app.models.transaction import Transaction
from app.models.category_merchant import Category
from app.models.budget import Budget
from app.models.subscription import Subscription

class ChatbotService:
    def __init__(self):
        self.client_initialized = False
        self._init_gemini()

    def _init_gemini(self):
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                self.client_initialized = True
                print("Gemini API client initialized.")
            except Exception as e:
                print(f"Failed to configure Gemini API client: {e}")
                self.client_initialized = False

    def build_rag_context(self, db: Session, user_id: int, query: str) -> str:
        # Load user context: transactions, budgets, subscriptions
        transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.date.desc()).limit(50).all()
        budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
        subscriptions = db.query(Subscription).filter(Subscription.user_id == user_id).all()

        trans_strs = []
        for t in transactions:
            m_name = t.merchant.name if t.merchant else "Unknown"
            c_name = t.category.name if t.category else "Uncategorized"
            date_str = t.date.strftime("%Y-%m-%d")
            trans_strs.append(f"- On {date_str}: Spent {t.amount} {settings.PROJECT_NAME} currency at {m_name} (Category: {c_name}) for {t.description or ''}")

        budget_strs = []
        for b in budgets:
            budget_strs.append(f"- Category: {b.category.name}, Monthly Limit: {b.amount}")

        sub_strs = []
        for s in subscriptions:
            sub_strs.append(f"- Active Subscription: {s.name}, Cost: {s.amount} ({s.billing_cycle})")

        context = "### User Financial Profile & Context\n"
        context += "Budgets:\n" + ("\n".join(budget_strs) if budget_strs else "No budgets configured.") + "\n\n"
        context += "Subscriptions:\n" + ("\n".join(sub_strs) if sub_strs else "No recurring subscriptions found.") + "\n\n"
        context += "Recent Transactions:\n" + ("\n".join(trans_strs) if trans_strs else "No transactions found.")
        
        return context

    def get_chat_response(self, db: Session, user_id: int, query: str) -> str:
        context = self.build_rag_context(db, user_id, query)
        
        prompt = f"""
You are "Finny", a professional, smart AI Finance Assistant.
Use the following context of the user's finances to answer their question. If their question requires details not in the context, guide them politely or offer recommendations.
Answer mathematically correctly. Keep answers structured, friendly, concise, and professional.

Context:
{context}

User Question: {query}
"""
        if self.client_initialized:
            try:
                response = self.model.generate_content(prompt)
                return response.text
            except Exception as e:
                print(f"Gemini API generation failed: {e}")
                
        # Intelligent Rule-Based Fallback Summary Response
        return self._generate_fallback_response(db, user_id, query)

    def _generate_fallback_response(self, db: Session, user_id: int, query: str) -> str:
        q_lower = query.lower()
        now = datetime.now()
        
        if "spend" in q_lower or "spent" in q_lower:
            # Query sum of expenses
            total = db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense"
            ).scalar() or 0.0
            return f"According to your records, your total historical spending is **{round(float(total), 2)}**. For specific date periods, you can check the Transactions tab which supports filter operations."
            
        elif "budget" in q_lower:
            budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
            if not budgets:
                return "You have not set up any budgets yet. You can create monthly budgets on the Budget progress dashboard!"
            resp = "Here are your current monthly budgets:\n"
            for b in budgets:
                resp += f"- **{b.category.name}**: {b.amount} limits\n"
            return resp

        elif "subscription" in q_lower or "recurring" in q_lower:
            subs = db.query(Subscription).filter(Subscription.user_id == user_id).all()
            if not subs:
                return "I couldn't find any active recurring subscriptions in your profile."
            resp = "Here are your active subscriptions:\n"
            for s in subs:
                resp += f"- **{s.name}**: {s.amount} ({s.billing_cycle})\n"
            return resp

        return "Hi there! I am Finny, your Smart Finance Assistant. (The Gemini API is not configured currently, so I'm operating in offline summary mode). Ask me about budgets, spending records, or subscriptions!"

chatbot_service = ChatbotService()
