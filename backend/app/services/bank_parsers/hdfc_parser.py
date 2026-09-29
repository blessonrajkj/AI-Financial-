import io
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.services.bank_parsers.base_parser import BaseBankParser

class HDFCBankParser(BaseBankParser):
    def __init__(self):
        super().__init__("HDFC Bank")

    def parse(self, content_bytes: bytes, password: Optional[str] = None) -> List[Dict[str, Any]]:
        transactions = []
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content_bytes), password=password) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if not text:
                        continue
                    lines = text.split("\n")
                    for line in lines:
                        # Match HDFC format e.g. DD/MM/YY
                        match = re.search(r'(\d{2}/\d{2}/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})', line)
                        if match:
                            dt_str, desc, debit_str, credit_str, bal_str = match.groups()
                            try:
                                dt = datetime.strptime(dt_str, "%d/%m/%Y") if len(dt_str) == 10 else datetime.strptime(dt_str, "%d/%m/%y")
                                debit = float(debit_str.replace(',', '')) if debit_str else 0.0
                                credit = float(credit_str.replace(',', '')) if credit_str else 0.0
                                bal = float(bal_str.replace(',', '')) if bal_str else 0.0
                                amount = debit if debit > 0 else credit
                                tx_type = "expense" if debit > 0 else "income"
                                transactions.append({
                                    "date": dt,
                                    "description": desc.strip(),
                                    "amount": amount,
                                    "type": tx_type,
                                    "debit_amount": debit,
                                    "credit_amount": credit,
                                    "balance": bal,
                                    "bank": self.bank_name,
                                    "payment_method": "Net Banking",
                                })
                            except Exception:
                                continue
        except Exception:
            pass
        return transactions
