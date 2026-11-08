import re
import csv
from datetime import datetime
from openpyxl import load_workbook
from typing import Any, Tuple, List, Dict, Optional
from app.services.category_taxonomy import auto_categorize

# Pre-compiled regex patterns for speed
RE_CLEAN_DATE = re.compile(r'[^\w\s\-/]')
RE_DATE_SPLIT = re.compile(r'[-/\s]')
RE_CLEAN_AMOUNT = re.compile(r'[^\d\.]')
RE_TIME = re.compile(r'(\d{1,2}:\d{2}(?::\d{2})?\s*(?:PM|AM|pm|am)?)')
RE_UPI = re.compile(r'\b([a-zA-Z0-9.\-_]+@(?:okaxis|oksbi|okicici|okhdfcbank|ybl|ibl|paytm|upi|axl|fbl|kotak))\b', re.IGNORECASE)
RE_UTR_12 = re.compile(r'\b(\d{12})\b')
RE_TXN_REF = re.compile(r'(?:txn|ref|utr|id)[:\s-]*\s*([a-zA-Z0-9]+)', re.IGNORECASE)
RE_PREFIX = re.compile(r'^(?:upi|imps|neft|rtgs|pos|chg|interest|transfer|ach|mandate|billpay)\s*[-/:]\s*', re.IGNORECASE)
RE_SLASH_12 = re.compile(r'/\d{12}/')
RE_SLASH_10 = re.compile(r'/\w{10,}/')

DATE_PATTERNS = [
    ("%Y-%m-%d", re.compile(r"^\d{4}-\d{1,2}-\d{1,2}")),
    ("%d/%m/%Y", re.compile(r"^\d{1,2}/\d{1,2}/\d{4}")),
    ("%d-%m-%Y", re.compile(r"^\d{1,2}-\d{1,2}-\d{4}")),
    ("%d-%b-%Y", re.compile(r"^\d{1,2}-[a-zA-Z]{3}-\d{4}")),
    ("%d %b %Y", re.compile(r"^\d{1,2}\s+[a-zA-Z]{3}\s+\d{4}")),
    ("%d/%m/%y", re.compile(r"^\d{1,2}/\d{1,2}/\d{2}")),
    ("%d-%m-%y", re.compile(r"^\d{1,2}-\d{1,2}-\d{2}")),
    ("%d %b %y", re.compile(r"^\d{1,2}\s+[a-zA-Z]{3}\s+\d{2}")),
    ("%d %B %Y", re.compile(r"^\d{1,2}\s+[a-zA-Z]{4,}\s+\d{4}")),
]

INCOME_KEYWORDS = ["cr", "credit", "received from", "received", "deposit", "salary", "interest", "refund", "payroll", "dividend", "cashback", "inflow"]
EXPENSE_KEYWORDS = ["dr", "debit", "withdrawal", "paid to", "upi payment", "purchase", "pos", "atm withdrawal", "payment", "outflow", "paid", "charge", "fee"]
RE_INCOME = re.compile(r'\b(?:' + '|'.join(re.escape(k) for k in INCOME_KEYWORDS) + r')\b', re.IGNORECASE)
RE_EXPENSE = re.compile(r'\b(?:' + '|'.join(re.escape(k) for k in EXPENSE_KEYWORDS) + r')\b', re.IGNORECASE)

class TabularStatementParser:
    """
    Optimized high-performance tabular statement parser for CSV and Excel files.
    - Normalizes and maps headers once per file.
    - Caches detected statement date formats for O(1) strptime parsing.
    - Avoids repetitive regex compilation and multi-pass full-file scans.
    - Strictly preserves debit/credit semantics, monetary precision, and balance separation.
    """

    @staticmethod
    def parse_amount(val: Any) -> float:
        if val is None or val == "":
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        s_val = str(val).replace(",", "").strip()
        cleaned = RE_CLEAN_AMOUNT.sub("", s_val)
        try:
            return float(cleaned) if cleaned else 0.0
        except ValueError:
            return 0.0

    @staticmethod
    def map_headers(header_row: List[Any]) -> Dict[str, int]:
        h_map = {}
        for idx, cell in enumerate(header_row):
            txt = str(cell or "").lower().strip()
            if not txt:
                continue

            if any(k in txt for k in ["date", "txn dt", "tran dt", "value dt", "txn date", "tx date"]):
                if "date" not in h_map or "txn" in txt or "value" in txt:
                    h_map["date"] = idx
            elif any(k in txt for k in ["particulars", "description", "narration", "remarks", "details", "transaction details", "particular"]):
                h_map["desc"] = idx
            elif any(k in txt for k in ["chq", "ref", "cheque", "utr", "instrument", "reference", "ref no", "txn id", "transaction id"]):
                h_map["ref"] = idx
            elif any(k in txt for k in ["debit", "withdrawal", "dr", "payment", "outflow", "paid", "dr.", "debts", "withdrawals"]):
                h_map["debit"] = idx
            elif any(k in txt for k in ["credit", "deposit", "cr", "receipt", "inflow", "received", "cr.", "credits", "deposits"]):
                h_map["credit"] = idx
            elif any(k in txt for k in ["amount", "value", "sum", "txn amt"]):
                h_map["amount"] = idx
            elif any(k in txt for k in ["balance", "bal", "closing", "bal.", "available balance"]):
                h_map["balance"] = idx
            elif any(k in txt for k in ["category", "cat"]):
                h_map["category"] = idx
            elif any(k in txt for k in ["subcategory", "subcat"]):
                h_map["subcategory"] = idx
            elif any(k in txt for k in ["merchant", "payee", "beneficiary"]):
                h_map["merchant"] = idx
            elif any(k in txt for k in ["type", "trans type", "txn type"]):
                h_map["type"] = idx
            elif any(k in txt for k in ["payment_method", "mode", "payment mode", "channel"]):
                h_map["payment_method"] = idx
        return h_map

    @classmethod
    def fast_parse_date(cls, date_str: str, cached_fmt: Optional[str] = None) -> Tuple[Optional[datetime], Optional[str]]:
        if not date_str:
            return None, None
            
        clean_str = RE_CLEAN_DATE.sub("", str(date_str)).strip()
        if not clean_str:
            return None, None

        # 1. Try cached format first
        if cached_fmt:
            try:
                sub_part = clean_str[:11] if "-" in cached_fmt or "/" in cached_fmt else clean_str
                return datetime.strptime(sub_part[:len(datetime.now().strftime(cached_fmt))], cached_fmt), cached_fmt
            except Exception:
                pass

        # 2. Fast-path ISO YYYY-MM-DD
        if len(clean_str) >= 10 and clean_str[4] in "-/" and clean_str[7] in "-/" and clean_str[:4].isdigit():
            try:
                return datetime.strptime(clean_str[:10], "%Y-%m-%d"), "%Y-%m-%d"
            except ValueError:
                pass

        # 3. Test compiled patterns
        for fmt, regex in DATE_PATTERNS:
            if regex.match(clean_str):
                try:
                    return datetime.strptime(clean_str[:len(datetime.now().strftime(fmt))], fmt), fmt
                except ValueError:
                    # Month name casing retry
                    parts = RE_DATE_SPLIT.split(clean_str)
                    if len(parts) >= 3:
                        parts[1] = parts[1].capitalize()
                        sep = '-' if '-' in clean_str else ('/' if '/' in clean_str else ' ')
                        try:
                            rejoined = sep.join(parts[:3])
                            return datetime.strptime(rejoined, fmt), fmt
                        except ValueError:
                            pass

        return None, None

    @classmethod
    def extract_merchant(cls, desc: str) -> str:
        if not desc:
            return "Unknown Merchant"
        cleaned = RE_PREFIX.sub("", desc)
        cleaned = RE_SLASH_12.sub(" ", cleaned)
        cleaned = RE_SLASH_10.sub(" ", cleaned)
        cleaned = cleaned.replace("/", " ").replace("-", " ").replace(":", " ").strip()
        words = cleaned.split()
        if not words:
            return "Unknown Merchant"
        merchant = " ".join(words[:3])
        m_lower = merchant.lower()
        
        # Canonical merchant normalization
        if "amazon" in m_lower: return "Amazon"
        if "swiggy" in m_lower: return "Swiggy"
        if "zomato" in m_lower: return "Zomato"
        if "google" in m_lower or "gpay" in m_lower: return "Google"
        if "phonepe" in m_lower: return "PhonePe"
        if "paytm" in m_lower: return "Paytm"
        if "netflix" in m_lower: return "Netflix"
        if "spotify" in m_lower: return "Spotify"
        if "sbi" in m_lower or "state bank" in m_lower: return "State Bank"
        if "indian oil" in m_lower or "iocl" in m_lower: return "Indian Oil"
        if "hpcl" in m_lower or "hindustan petroleum" in m_lower: return "HPCL"
        if "bpcl" in m_lower or "bharat petroleum" in m_lower: return "BPCL"
        
        return merchant[:30].strip()

    @classmethod
    def determine_type(cls, amt_str: str, desc_str: str) -> str:
        s_amt = str(amt_str or "").lower().strip()
        s_desc = str(desc_str or "").lower().strip()

        if "+" in s_amt or "cr" in s_amt or "credit" in s_amt:
            return "income"
        if "-" in s_amt or "dr" in s_amt or "debit" in s_amt:
            return "expense"

        if RE_INCOME.search(s_desc):
            return "income"
        for kw in INCOME_KEYWORDS:
            if s_desc.startswith(kw):
                return "income"

        if RE_EXPENSE.search(s_desc):
            return "expense"
        for kw in EXPENSE_KEYWORDS:
            if s_desc.startswith(kw):
                return "expense"

        return "expense"

    @classmethod
    def parse_tabular_data(cls, raw_rows: List[List[Any]], default_bank: str = "Generic CSV/Excel") -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        transactions = []
        invalid_rows = []
        if not raw_rows:
            return transactions, invalid_rows

        # Step 1: Scan for first row with >= 2 headers
        header_row_idx = -1
        col_map = {}
        for r_idx, row in enumerate(raw_rows[:15]):
            m = cls.map_headers(row)
            if len(m) >= 2:
                header_row_idx = r_idx
                col_map = m
                break

        if header_row_idx == -1:
            col_map = {"date": 0, "desc": 1, "ref": 2, "amount": 3, "balance": 4}

        date_col = col_map.get("date", 0)
        desc_col = col_map.get("desc", 1)
        ref_col = col_map.get("ref", 2)
        debit_col = col_map.get("debit")
        credit_col = col_map.get("credit")
        amount_col = col_map.get("amount")
        balance_col = col_map.get("balance")
        cat_col = col_map.get("category")
        subcat_col = col_map.get("subcategory")
        merch_col = col_map.get("merchant")
        type_col = col_map.get("type")
        pm_col = col_map.get("payment_method")

        cached_date_fmt = None
        data_rows = raw_rows[header_row_idx + 1:]

        # Step 2: Iterate and extract rows
        for row_num, row in enumerate(data_rows, start=header_row_idx + 2):
            if not row or not any(row):
                continue
            if date_col >= len(row):
                continue

            raw_date_cell = row[date_col]
            if raw_date_cell is None or str(raw_date_cell).strip() == "":
                continue

            # Check if openpyxl already passed a datetime object
            if isinstance(raw_date_cell, datetime):
                parsed_date = raw_date_cell
            else:
                date_str = str(raw_date_cell).strip()
                parsed_date, new_fmt = cls.fast_parse_date(date_str, cached_date_fmt)
                if new_fmt:
                    cached_date_fmt = new_fmt

            if not parsed_date:
                # Row does not represent a valid financial transaction
                continue

            time_str = RE_TIME.search(str(raw_date_cell)).group(1) if RE_TIME.search(str(raw_date_cell)) else None
            desc_str = str(row[desc_col] or "").strip() if desc_col < len(row) else ""
            ref_str = str(row[ref_col] or "").strip() if ref_col < len(row) else ""

            # Amount & Direction Logic
            amount = 0.0
            tx_type = "expense"

            # Scenario A: Separate Debit / Credit Columns
            if debit_col is not None and debit_col < len(row) and credit_col is not None and credit_col < len(row):
                deb_val = cls.parse_amount(row[debit_col])
                cre_val = cls.parse_amount(row[credit_col])
                if cre_val > 0:
                    amount = cre_val
                    tx_type = "income"
                elif deb_val > 0:
                    amount = deb_val
                    tx_type = "expense"
                else:
                    deb_txt = str(row[debit_col] or "").strip()
                    cre_txt = str(row[credit_col] or "").strip()
                    if cre_txt and not deb_txt:
                        amount = cre_val
                        tx_type = "income"
                    elif deb_txt and not cre_txt:
                        amount = deb_val
                        tx_type = "expense"
            # Scenario B: Single Amount Column
            elif amount_col is not None and amount_col < len(row):
                amt_str = str(row[amount_col] or "")
                amount = cls.parse_amount(amt_str)
                if type_col is not None and type_col < len(row) and row[type_col]:
                    t_val = str(row[type_col]).lower().strip()
                    if "inc" in t_val or "cr" in t_val:
                        tx_type = "income"
                    elif "trans" in t_val:
                        tx_type = "transfer"
                    else:
                        tx_type = "expense"
                else:
                    tx_type = cls.determine_type(amt_str, desc_str)
            else:
                # Search other numeric cells
                for c_i, cell in enumerate(row):
                    if c_i not in (date_col, desc_col):
                        val = cls.parse_amount(cell)
                        if val > 0:
                            amount = val
                            tx_type = cls.determine_type(str(cell or ""), desc_str)
                            break

            if not amount:
                continue

            # Balance Column Handling
            balance = None
            if balance_col is not None and balance_col < len(row):
                bal_val = row[balance_col]
                if bal_val is not None and str(bal_val).strip():
                    balance = cls.parse_amount(bal_val)

            # Merchant Normalization
            if merch_col is not None and merch_col < len(row) and row[merch_col]:
                merchant_name = str(row[merch_col]).strip()
            else:
                merchant_name = cls.extract_merchant(desc_str)

            # Category & Taxonomy Classification
            if cat_col is not None and cat_col < len(row) and row[cat_col]:
                main_cat = str(row[cat_col]).strip()
                sub_cat = str(row[subcat_col]).strip() if subcat_col is not None and subcat_col < len(row) else "Uncategorized"
                calc_type = tx_type
            else:
                calc_type, main_cat, sub_cat = auto_categorize(tx_type, merchant_name, desc_str)

            # Payment Method
            upi_id = None
            if pm_col is not None and pm_col < len(row) and row[pm_col]:
                payment_method = str(row[pm_col]).strip()
                m_upi = RE_UPI.search(desc_str)
                if m_upi: upi_id = m_upi.group(1)
            else:
                m_upi = RE_UPI.search(desc_str)
                if m_upi: upi_id = m_upi.group(1)
                
                desc_lower = desc_str.lower()
                if upi_id or "upi" in desc_lower or "gpay" in desc_lower or "phonepe" in desc_lower or "paytm" in desc_lower:
                    payment_method = "UPI"
                elif any(k in desc_lower for k in ["card", "pos", "visa", "mastercard"]):
                    payment_method = "Credit Card"
                elif any(k in desc_lower for k in ["neft", "imps", "rtgs", "net bank", "transfer"]):
                    payment_method = "Net Banking"
                else:
                    payment_method = "Cash"

            # Transaction ID / Reference Number
            m_utr = RE_UTR_12.search(desc_str)
            m_ref = RE_TXN_REF.search(desc_str)
            tx_id = (m_utr.group(1) if m_utr else (m_ref.group(1) if m_ref else ref_str))
            if not tx_id:
                tx_id = f"TXN-{parsed_date.strftime('%Y%m%d')}-{int(amount)}"

            direction = "in" if calc_type == "income" else "out"
            debit_amt = amount if calc_type == "expense" else None
            credit_amt = amount if calc_type == "income" else None

            transactions.append({
                "date": parsed_date.isoformat(),
                "time": time_str,
                "amount": amount,
                "type": calc_type,
                "direction": direction,
                "debit_amount": debit_amt,
                "credit_amount": credit_amt,
                "merchant": merchant_name,
                "description": desc_str,
                "transaction_id": tx_id,
                "reference_number": ref_str or tx_id,
                "balance": balance,
                "payment_method": payment_method,
                "upi_id": upi_id,
                "bank": default_bank,
                "category": main_cat,
                "subcategory": sub_cat
            })

        return transactions, invalid_rows

tabular_parser = TabularStatementParser()
