import re
from datetime import datetime
from sqlalchemy.orm import Session
from app.services.ml_categorizer import ml_categorizer
from app.core.config import settings

class VoiceParser:
    def __init__(self):
        self.model_initialized = settings.GEMINI_API_KEY is not None

    def parse_transcript(self, transcript: str, db: Session) -> dict:
        result = {
            "amount": None,
            "category_name": "Miscellaneous",
            "merchant_name": None,
            "date": datetime.now(),
            "description": transcript
        }

        # 1. Attempt LLM Parsing if configured
        if self.model_initialized:
            try:
                import google.generativeai as genai
                model = genai.GenerativeModel('gemini-1.5-flash')
                prompt = f"""
You are an expert financial transaction data extractor. Extract transaction details from the following voice transcript text. Return ONLY a valid JSON string (no markdown formatting, no ```json) containing the keys:
- amount: float or null
- merchant_name: string or null
- category_keyword: string (like petrol, dining, groceries, rent) or null
- description: string

Transcript: "{transcript}"
"""
                response = model.generate_content(prompt)
                text_response = response.text.strip()
                # Clean markdown blocks if Gemini outputs them anyway
                text_response = re.sub(r"```(?:json)?|```", "", text_response).strip()
                
                import json
                parsed = json.loads(text_response)
                
                if parsed.get("amount"):
                    result["amount"] = float(parsed["amount"])
                if parsed.get("merchant_name"):
                    result["merchant_name"] = parsed["merchant_name"]
                if parsed.get("description"):
                    result["description"] = parsed["description"]
                
                keyword = parsed.get("category_keyword") or result["merchant_name"] or ""
                cat_id = ml_categorizer.predict_category(keyword, transcript, db)
                from app.models.category_merchant import Category
                cat = db.query(Category).filter(Category.id == cat_id).first()
                if cat:
                    result["category_name"] = cat.name
                
                return result
            except Exception as e:
                print(f"Gemini voice parsing failed, using regex extractor: {e}")

        # 2. Regex Extraction Fallback
        # Look for numbers (amount)
        amount_match = re.search(r'(?:spent|cost|pay|paid|rupees|rs\.?|\$)\s*(\d+(?:\.\d{2})?)', transcript, re.IGNORECASE)
        if not amount_match:
            amount_match = re.search(r'(\d+(?:\.\d{2})?)\s*(?:rupees|rs\.?|dollars|\$)', transcript, re.IGNORECASE)
        
        if amount_match:
            try:
                result["amount"] = float(amount_match.group(1))
            except ValueError:
                pass

        # Look for category indicators like "on petrol", "for dinner", "at starbucks"
        on_match = re.search(r'on\s+([A-Za-z0-9\s]+?)(?:\s+at|\s+for|\s+on|\.|$)', transcript, re.IGNORECASE)
        for_match = re.search(r'for\s+([A-Za-z0-9\s]+?)(?:\s+at|\s+for|\s+on|\.|$)', transcript, re.IGNORECASE)
        at_match = re.search(r'at\s+([A-Za-z0-9\s]+?)(?:\s+at|\s+for|\s+on|\.|$)', transcript, re.IGNORECASE)

        keyword = ""
        if on_match:
            keyword = on_match.group(1).strip()
        elif for_match:
            keyword = for_match.group(1).strip()

        if at_match:
            result["merchant_name"] = at_match.group(1).strip()
        else:
            result["merchant_name"] = keyword or "Unknown Merchant"

        cat_id = ml_categorizer.predict_category(result["merchant_name"], keyword or transcript, db)
        from app.models.category_merchant import Category
        cat = db.query(Category).filter(Category.id == cat_id).first()
        if cat:
            result["category_name"] = cat.name

        return result

voice_parser = VoiceParser()
