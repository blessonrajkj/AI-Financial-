import os
import re
import cv2
import numpy as np
import fitz  # PyMuPDF
from datetime import datetime
from app.core.config import settings
from app.services.ocr_service import ocr_service

class PDFStatementParser:
    def __init__(self):
        # Specific Indian bank keywords matching for detection
        self.banks_keywords = {
            "State Bank of India": ["state bank of india", "sbi", "posb", "post office savings"],
            "HDFC": ["hdfc bank", "hdfc"],
            "ICICI": ["icici bank", "icici"],
            "Axis": ["axis bank", "axis"],
            "Canara": ["canara bank", "canara"],
            "Indian Bank": ["indian bank"],
            "Punjab National Bank": ["punjab national bank", "pnb"],
            "Union Bank": ["union bank of india", "union bank"],
            "Bank of Baroda": ["bank of baroda", "bob", "baroda"],
            "IDFC": ["idfc first bank", "idfc first", "idfc bank", "idfc"],
            "Kotak": ["kotak mahindra bank", "kotak bank", "kotak"],
            "Federal": ["federal bank"],
            "South Indian Bank": ["south indian bank", "sib"],
            "Indian Overseas Bank": ["indian overseas bank", "iob"],
            "Post Office Savings": ["post office savings bank", "india post", "post office"]
        }

    def detect_bank(self, text: str) -> str:
        text_lower = text.lower()
        for bank_name, kws in self.banks_keywords.items():
            for kw in kws:
                if kw in text_lower:
                    return bank_name
        return "Generic PDF"

    def is_scanned_pdf(self, pdf_path: str) -> bool:
        try:
            doc = fitz.open(pdf_path)
            total_text = ""
            for page in doc:
                total_text += page.get_text()
            doc.close()
            # If total selectable text length is very low, it's scanned/image PDF
            return len(total_text.strip()) < 50
        except Exception as e:
            print(f"Error checking if PDF is scanned: {e}")
            return True

    def get_text_color_type(self, color_int) -> str:
        if color_int is None:
            return "black"
        
        # Extract RGB components from integer representation
        # PyMuPDF color int is s["color"] which represents: (r << 16) + (g << 8) + b or similar
        # Let's unpack:
        r = (color_int >> 16) & 255
        g = (color_int >> 8) & 255
        b = color_int & 255
        
        # High green dominance -> Green
        if g > r * 1.15 and g > b * 1.15 and g > 60:
            return "green"
        # High red dominance -> Red
        if r > g * 1.15 and r > b * 1.15 and r > 60:
            return "red"
            
        return "black"

    def extract_rows_from_pymupdf(self, page) -> list:
        spans = []
        try:
            text_dict = page.get_text("dict")
            for block in text_dict.get("blocks", []):
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            spans.append(span)
        except Exception as e:
            print(f"PyMuPDF dict extraction failed: {e}")
            return []

        if not spans:
            return []

        # Sort spans vertically by top-y coordinate (y0)
        spans.sort(key=lambda s: s["bbox"][1])
        
        rows = []
        current_row = []
        current_y = None
        tolerance = 4.0  # Vertical line tolerance (in points)
        
        for s in spans:
            y0 = s["bbox"][1]
            if current_y is None:
                current_y = y0
                current_row.append(s)
            elif abs(y0 - current_y) <= tolerance:
                current_row.append(s)
            else:
                # Sort horizontally by left-x coordinate (x0)
                current_row.sort(key=lambda item: item["bbox"][0])
                rows.append(current_row)
                current_row = [s]
                current_y = y0
                
        if current_row:
            current_row.sort(key=lambda item: item["bbox"][0])
            rows.append(current_row)

        # Merge horizontal elements that are part of the same cell/column
        final_rows = []
        h_tolerance = 12.0  # Horizontal spacing tolerance
        
        for r in rows:
            cells = []
            current_cell_text = ""
            current_cell_color = None
            current_cell_x1 = None
            
            for span in r:
                text = span["text"].strip()
                if not text:
                    continue
                x0, y0, x1, y1 = span["bbox"]
                color = span["color"]
                
                if current_cell_text == "":
                    current_cell_text = text
                    current_cell_color = color
                    current_cell_x1 = x1
                elif current_cell_x1 is not None and (x0 - current_cell_x1) <= h_tolerance:
                    current_cell_text += " " + text
                    current_cell_x1 = x1
                    # Retain color properties if non-black
                    if self.get_text_color_type(color) != "black":
                        current_cell_color = color
                else:
                    cells.append({"text": current_cell_text, "color": current_cell_color})
                    current_cell_text = text
                    current_cell_color = color
                    current_cell_x1 = x1
                    
            if current_cell_text:
                cells.append({"text": current_cell_text, "color": current_cell_color})
                
            if cells:
                final_rows.append(cells)
                
        return final_rows

    def find_headers(self, cells) -> dict:
        header_map = {}
        for idx, cell in enumerate(cells):
            txt = cell["text"].lower().strip()
            if any(k in txt for k in ["date", "txn dt", "tran dt", "value dt", "txn date", "tx date"]):
                header_map["date"] = idx
            elif any(k in txt for k in ["particulars", "description", "narration", "remarks", "details", "transaction details", "particular"]):
                header_map["desc"] = idx
            elif any(k in txt for k in ["chq", "ref", "cheque", "utr", "instrument", "reference", "ref no", "txn id", "transaction id"]):
                header_map["ref"] = idx
            elif any(k in txt for k in ["debit", "withdrawal", "dr", "payment", "outflow", "paid", "dr.", "debts", "withdrawals"]):
                header_map["debit"] = idx
            elif any(k in txt for k in ["credit", "deposit", "cr", "receipt", "inflow", "received", "cr.", "credits", "deposits"]):
                header_map["credit"] = idx
            elif any(k in txt for k in ["amount", "value", "sum", "txn amt"]):
                header_map["amount"] = idx
            elif any(k in txt for k in ["balance", "bal", "closing", "bal.", "available balance"]):
                header_map["balance"] = idx
        return header_map

    def parse_date(self, date_str: str) -> datetime | None:
        # Normalize and remove punctuation/words that aren't parts of dates
        clean_str = re.sub(r'[^\w\s\-/]', '', date_str).strip()
        
        date_patterns = [
            ("%d-%b-%Y", r"\b\d{1,2}-[a-zA-Z]{3}-\d{4}\b"),
            ("%d/%m/%Y", r"\b\d{1,2}/\d{1,2}/\d{4}\b"),
            ("%d-%m-%Y", r"\b\d{1,2}-\d{1,2}-\d{4}\b"),
            ("%d/%m/%y", r"\b\d{1,2}/\d{1,2}/\d{2}\b"),
            ("%d-%m-%y", r"\b\d{1,2}-\d{1,2}-\d{2}\b"),
            ("%Y-%m-%d", r"\b\d{4}-\d{1,2}-\d{1,2}\b"),
            ("%d %b %Y", r"\b\d{1,2}\s+[a-zA-Z]{3}\s+\d{4}\b"),
            ("%d %b %y", r"\b\d{1,2}\s+[a-zA-Z]{3}\s+\d{2}\b"),
            ("%d %B %Y", r"\b\d{1,2}\s+[a-zA-Z]{4,}\s+\d{4}\b")
        ]
        
        for fmt, regex in date_patterns:
            match = re.search(regex, clean_str, re.IGNORECASE)
            if match:
                match_val = match.group(0)
                try:
                    return datetime.strptime(match_val, fmt)
                except ValueError:
                    # Attempt capitalizing month name
                    parts = re.split(r'[-/\s]', match_val)
                    if len(parts) == 3:
                        parts[1] = parts[1].capitalize()
                        try:
                            # Re-join with formatting match
                            sep = '-' if '-' in match_val else ('/' if '/' in match_val else ' ')
                            return datetime.strptime(sep.join(parts), fmt)
                        except ValueError:
                            pass
        return None

    def extract_time(self, date_str: str) -> str | None:
        time_match = re.search(r'(\d{1,2}:\d{2}(?::\d{2})?\s*(?:PM|AM|pm|am)?)', date_str)
        return time_match.group(1) if time_match else None

    def parse_amount(self, amt_str: str) -> float:
        if not amt_str:
            return 0.0
        # Clean currency indicators and commas
        cleaned = re.sub(r'[^\d\.]', '', amt_str.replace(",", ""))
        try:
            return float(cleaned) if cleaned else 0.0
        except ValueError:
            return 0.0

    def check_description_for_income(self, desc: str) -> bool:
        desc_lower = desc.lower()
        income_keywords = [
            "received from", "received", "refund", "salary", "payroll", "interest credit", 
            "dividend", "credit", "cr", "inflow", "deposit", "cash deposit", " cashback"
        ]
        return any(kw in desc_lower for kw in income_keywords)

    def classify_specific_type(self, desc: str, general_type: str) -> str:
        desc_lower = desc.lower()
        if general_type == "income":
            if any(k in desc_lower for k in ["salary", "payroll", "stipend"]):
                return "Salary"
            elif any(k in desc_lower for k in ["interest", "int.rec"]):
                return "Interest"
            elif any(k in desc_lower for k in ["dividend", "div"]):
                return "Dividend"
            elif any(k in desc_lower for k in ["refund", "reimb"]):
                return "Refund"
            return "Income"
        else:
            if any(k in desc_lower for k in ["loan", "emi", "mortgage", "housing loan"]):
                return "Loan EMI"
            elif any(k in desc_lower for k in ["netflix", "spotify", "prime", "youtube premium", "subscription", "aws", "gsuite", "github"]):
                return "Subscription"
            elif any(k in desc_lower for k in ["zerodha", "groww", "mutual fund", "stocks", "sip", "investment", "bonds"]):
                return "Investment"
            elif any(k in desc_lower for k in ["cash withdrawal", "atm", "self w/d", "cash w/d"]):
                return "Cash Withdrawal"
            elif any(k in desc_lower for k in ["transfer", "imps to", "neft to", "rtgs to"]):
                return "Transfer"
            return "Expense"

    def extract_merchant(self, desc: str) -> str:
        # Remove transaction prefixes
        cleaned = re.sub(r'^(?:upi|imps|neft|rtgs|pos|chg|interest|transfer|ach|mandate|billpay)\s*[-/:]\s*', '', desc, flags=re.IGNORECASE)
        cleaned = re.sub(r'/\d{12}/', ' ', cleaned)
        cleaned = re.sub(r'/\w{10,}/', ' ', cleaned)
        
        # Replace separator characters
        cleaned = cleaned.replace('/', ' ').replace('-', ' ').replace(':', ' ').strip()
        words = cleaned.split()
        if not words:
            return "Unknown Merchant"
            
        merchant = " ".join(words[:3])
        m_lower = merchant.lower()
        
        # Common merchant auto detection mapping
        if "amazon" in m_lower:
            return "Amazon"
        elif "swiggy" in m_lower:
            return "Swiggy"
        elif "zomato" in m_lower:
            return "Zomato"
        elif "google" in m_lower or "gpay" in m_lower:
            return "Google"
        elif "phonepe" in m_lower:
            return "PhonePe"
        elif "paytm" in m_lower:
            return "Paytm"
        elif "netflix" in m_lower:
            return "Netflix"
        elif "spotify" in m_lower:
            return "Spotify"
        elif "sbi" in m_lower or "state bank" in m_lower:
            return "State Bank"
        elif "indian oil" in m_lower or "iocl" in m_lower:
            return "Indian Oil"
        elif "hpcl" in m_lower or "hindustan petroleum" in m_lower:
            return "HPCL"
        elif "bpcl" in m_lower or "bharat petroleum" in m_lower:
            return "BPCL"
            
        return merchant[:30].strip()

    def classify_category(self, desc: str, specific_type: str) -> str:
        if specific_type == "Salary":
            return "Salary"
        elif specific_type in ["Interest", "Dividend"]:
            return "Other Income"
        elif specific_type == "Refund":
            return "Refunds"
        elif specific_type == "Subscription":
            return "Subscriptions"
        elif specific_type == "Investment":
            return "Investment"
        elif specific_type == "Loan EMI":
            return "Bills"
            
        desc_lower = desc.lower()
        category_rules = [
            ("Food", ["swiggy", "zomato", "restaurant", "cafe", "burger", "pizza", "kfc", "mcdonald", "dining"]),
            ("Shopping", ["amazon", "flipkart", "myntra", "zara", "clothing", "shopping", "reliance digital", "croma"]),
            ("Medical", ["hospital", "pharmacy", "medical", "doctor", "apollo", "clinic", "lab"]),
            ("Fuel", ["shell", "petrol", "fuel", "indian oil", "hpcl", "bpcl", "hindustan petroleum"]),
            ("Travel", ["uber", "ola", "metro", "cab", "taxi", "irctc", "railway", "flight", "booking", "hotel", "travel"]),
            ("Recharge", ["recharge", "prepaid", "dth", "jio", "airtel", "vi"]),
            ("Electricity", ["electricity", "eb bill", "electricity bill"]),
            ("Post Office", ["post office", "india post", "posb"]),
            ("Insurance", ["lic", "insurance", "hdfc ergo", "max life"]),
            ("Education", ["udemy", "coursera", "school", "college", "tuition", "books"]),
            ("Entertainment", ["netflix", "spotify", "bookmyshow", "cinema", "movie", "gaming", "steam"])
        ]
        
        for cat_name, keywords in category_rules:
            if any(kw in desc_lower for kw in keywords):
                return cat_name
                
        return "Others"

    def extract_upi_id(self, desc: str) -> str | None:
        match = re.search(r'\b([a-zA-Z0-9.-_]+@(?:okaxis|oksbi|okicici|okhdfcbank|ybl|ibl|paytm|upi|axl|fbl|kotak))\b', desc, re.IGNORECASE)
        return match.group(1) if match else None

    def detect_payment_method(self, desc: str, upi_id: str | None = None) -> str:
        if upi_id or "upi" in desc.lower() or "gpay" in desc.lower() or "phonepe" in desc.lower() or "paytm" in desc.lower():
            return "UPI"
        elif any(k in desc.lower() for k in ["card", "pos", "visa", "mastercard"]):
            return "Credit Card"
        elif any(k in desc.lower() for k in ["neft", "imps", "rtgs", "net bank", "transfer"]):
            return "Net Banking"
        return "Cash"

    def extract_ref_number(self, desc: str) -> str | None:
        utr_match = re.search(r'\b(\d{12})\b', desc)
        if utr_match:
            return utr_match.group(1)
        ref_match = re.search(r'(?:txn|ref|utr|id)[:\s-]*\s*([a-zA-Z0-9]+)', desc, re.IGNORECASE)
        return ref_match.group(1) if ref_match else None

    def determine_type_from_text_and_color(self, amt_text: str, desc_str: str, color_type: str) -> str:
        amt_lower = amt_text.lower().strip()
        desc_lower = desc_str.lower().strip()
        
        # 1. Check direct prefix/suffix on amount text
        if "+" in amt_text:
            return "income"
        if "-" in amt_text:
            return "expense"
        if "cr" in amt_lower or "credit" in amt_lower:
            return "income"
        if "dr" in amt_lower or "debit" in amt_lower:
            return "expense"
            
        # 2. Check description keywords for Income
        income_keywords = [
            "cr", "credit", "received from", "received", "deposit", 
            "salary", "interest", "refund", "payroll", "dividend", 
            "cashback", "inflow", "deposit"
        ]
        # Check description keywords for Expense
        expense_keywords = [
            "dr", "debit", "withdrawal", "paid to", "upi payment", 
            "purchase", "pos", "atm withdrawal", "payment", "outflow", 
            "paid", "charge", "fee"
        ]
        
        for kw in income_keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', desc_lower) or desc_lower.startswith(kw):
                return "income"
                
        for kw in expense_keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', desc_lower) or desc_lower.startswith(kw):
                return "expense"
                
        # 3. Fallback to color detection
        if color_type == "green":
            return "income"
        elif color_type == "red":
            return "expense"
            
        # Default fallback
        return "expense"

    def parse_table_rows(self, rows: list, bank_name: str) -> tuple:
        transactions = []
        invalid_rows = []
        
        header_map = {}
        
        for row_idx, cells in enumerate(rows):
            # Evaluate if row is a header
            temp_map = self.find_headers(cells)
            if len(temp_map) >= 3:
                header_map = temp_map
                continue
                
            # If no header detected, assume standard default column layout
            current_map = header_map if header_map else {"date": 0, "desc": 1, "ref": 2, "amount": 3, "balance": 4}
            
            if len(cells) < 2:
                continue
                
            # Date Extraction
            date_idx = current_map.get("date", 0)
            if date_idx >= len(cells):
                continue
            date_str = cells[date_idx]["text"]
            
            parsed_date = self.parse_date(date_str)
            if not parsed_date:
                # Row does not represent a transaction
                continue
                
            parsed_time = self.extract_time(date_str)
            
            # Description Narration
            desc_idx = current_map.get("desc", 1)
            desc_str = cells[desc_idx]["text"] if desc_idx < len(cells) else ""
            
            # Reference / Cheque
            ref_idx = current_map.get("ref", 2)
            ref_str = cells[ref_idx]["text"] if ref_idx < len(cells) else ""
            
            # Numeric Amount + Type Parsing
            debit_idx = current_map.get("debit")
            credit_idx = current_map.get("credit")
            amount_idx = current_map.get("amount")
            
            amount = 0.0
            tx_type = "expense"
            
            # Scenario 1: Separate Debit / Credit Columns
            if debit_idx is not None and debit_idx < len(cells) and credit_idx is not None and credit_idx < len(cells):
                debit_cell_text = cells[debit_idx]["text"].strip()
                credit_cell_text = cells[credit_idx]["text"].strip()
                
                deb_val = self.parse_amount(debit_cell_text)
                cre_val = self.parse_amount(credit_cell_text)
                
                has_debit = deb_val > 0 and any(c.isdigit() for c in debit_cell_text)
                has_credit = cre_val > 0 and any(c.isdigit() for c in credit_cell_text)
                
                if has_credit:
                    amount = cre_val
                    tx_type = "income"
                elif has_debit:
                    amount = deb_val
                    tx_type = "expense"
                else:
                    # Fallback to check column positions even if amount is 0 or non-standard format
                    if credit_cell_text and not debit_cell_text:
                        amount = cre_val if cre_val > 0 else 0.0
                        tx_type = "income"
                    elif debit_cell_text and not credit_cell_text:
                        amount = deb_val if deb_val > 0 else 0.0
                        tx_type = "expense"
                        
            # Scenario 2: Single Amount Column with Suffix / Indicators
            elif amount_idx is not None and amount_idx < len(cells):
                amt_cell = cells[amount_idx]
                amt_text = amt_cell["text"]
                amount_color_type = self.get_text_color_type(amt_cell["color"])
                
                amount = self.parse_amount(amt_text)
                tx_type = self.determine_type_from_text_and_color(amt_text, desc_str, amount_color_type)
            else:
                # Fallback: check other cells for numerical amounts
                found_amount = False
                for c_idx in range(len(cells)):
                    if c_idx != date_idx and c_idx != desc_idx:
                        amt_cell = cells[c_idx]
                        amt_text = amt_cell["text"]
                        val = self.parse_amount(amt_text)
                        if val > 0:
                            amount = val
                            amount_color_type = self.get_text_color_type(amt_cell["color"])
                            tx_type = self.determine_type_from_text_and_color(amt_text, desc_str, amount_color_type)
                            found_amount = True
                            break
            
            # Stop if amount is not found or is 0
            if not amount:
                continue
                
            # Balance
            bal_idx = current_map.get("balance", -1)
            balance = None
            if bal_idx != -1 and bal_idx < len(cells):
                balance = self.parse_amount(cells[bal_idx]["text"])
                
            # Classify specific financial ledger type
            specific_type = self.classify_specific_type(desc_str, tx_type)
            merchant_name = self.extract_merchant(desc_str)
            category = self.classify_category(desc_str, specific_type)
            upi_id = self.extract_upi_id(desc_str)
            payment_method = self.detect_payment_method(desc_str, upi_id)
            tx_id = self.extract_ref_number(desc_str) or ref_str
            
            if not tx_id:
                # Make a reproducible dummy transaction ID
                tx_id = f"TXN-{parsed_date.strftime('%Y%m%d')}-{int(amount)}"
                
            tx_item = {
                "date": parsed_date.isoformat(),
                "time": parsed_time,
                "amount": amount,
                "type": tx_type,  # matches bulk-import expectation: income or expense
                "merchant": merchant_name,
                "description": desc_str,
                "transaction_id": tx_id,
                "reference_number": ref_str or tx_id,
                "balance": balance,
                "payment_method": payment_method,
                "upi_id": upi_id,
                "bank": bank_name,
                "category": category
            }
            transactions.append(tx_item)
            
        return transactions, invalid_rows

    def parse_selectable_pdf(self, pdf_path: str) -> tuple:
        doc = fitz.open(pdf_path)
        all_text = ""
        for page in doc:
            all_text += page.get_text()
            
        bank_name = self.detect_bank(all_text)
        
        parsed_transactions = []
        invalid_rows = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            rows = self.extract_rows_from_pymupdf(page)
            page_transactions, page_invalid = self.parse_table_rows(rows, bank_name)
            parsed_transactions.extend(page_transactions)
            invalid_rows.extend(page_invalid)
            
        doc.close()
        return parsed_transactions, invalid_rows, bank_name

    def detect_bbox_color(self, img_path: str, bbox) -> str:
        try:
            # bbox coordinates: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
            img = cv2.imread(img_path)
            if img is None:
                return "black"
            
            # Crop bounds
            x0 = int(min(pt[0] for pt in bbox))
            y0 = int(min(pt[1] for pt in bbox))
            x1 = int(max(pt[0] for pt in bbox))
            y1 = int(max(pt[1] for pt in bbox))
            
            h, w, _ = img.shape
            x0 = max(0, min(x0, w - 1))
            y0 = max(0, min(y0, h - 1))
            x1 = max(0, min(x1, w - 1))
            y1 = max(0, min(y1, h - 1))
            
            if x1 <= x0 or y1 <= y0:
                return "black"
                
            crop = img[y0:y1, x0:x1]
            
            # Check HSV dominant colors
            hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
            
            # Green HSV range
            lower_green = np.array([35, 40, 40])
            upper_green = np.array([85, 255, 255])
            green_mask = cv2.inRange(hsv, lower_green, upper_green)
            green_ratio = np.sum(green_mask > 0) / green_mask.size
            
            # Red HSV range (wraps around 0 and 180)
            lower_red1 = np.array([0, 40, 40])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([170, 40, 40])
            upper_red2 = np.array([180, 255, 255])
            
            red_mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
            red_mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
            red_mask = red_mask1 + red_mask2
            red_ratio = np.sum(red_mask > 0) / red_mask.size
            
            if green_ratio > 0.04 and green_ratio > red_ratio:
                return "green"
            elif red_ratio > 0.04 and red_ratio > green_ratio:
                return "red"
        except Exception as e:
            print(f"Error sampling box color: {e}")
        return "black"

    def parse_scanned_pdf(self, pdf_path: str) -> tuple:
        reader = ocr_service._get_reader()
        if not reader or reader == "fallback":
            # Lazy initialize EasyOCR reader
            try:
                import easyocr
                reader = easyocr.Reader(['en'])
            except Exception:
                reader = None
                
        doc = fitz.open(pdf_path)
        
        parsed_transactions = []
        invalid_rows = []
        
        if len(doc) == 0:
            doc.close()
            return [], [], "Generic PDF"
            
        # Extract a sample text from first page to detect bank
        pix = doc[0].get_pixmap(dpi=150)
        temp_img_path = os.path.join(settings.UPLOAD_DIR, "bank_detect_temp.png")
        pix.save(temp_img_path)
        
        sample_text = ""
        if reader:
            try:
                ocr_results = reader.readtext(temp_img_path)
                sample_text = "\n".join(text for bbox, text, prob in ocr_results)
            except Exception as e:
                print(f"EasyOCR detection error: {e}")
        
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
            
        bank_name = self.detect_bank(sample_text)
        
        # Iterate pages and perform full OCR scanning
        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=150)
            page_img_path = os.path.join(settings.UPLOAD_DIR, f"ocr_page_{page_num}.png")
            pix.save(page_img_path)
            
            if not reader:
                if os.path.exists(page_img_path):
                    os.remove(page_img_path)
                continue
                
            try:
                ocr_results = reader.readtext(page_img_path)
            except Exception as e:
                print(f"EasyOCR page extraction failed: {e}")
                if os.path.exists(page_img_path):
                    os.remove(page_img_path)
                continue
                
            # Group OCR bounding boxes into rows based on y-coordinate (8 pixel tolerance)
            ocr_results.sort(key=lambda item: item[0][0][1])
            
            rows = []
            current_row = []
            current_y = None
            tolerance = 8.0
            
            for item in ocr_results:
                bbox, text, prob = item
                y0 = bbox[0][1]
                if current_y is None:
                    current_y = y0
                    current_row.append(item)
                elif abs(y0 - current_y) <= tolerance:
                    current_row.append(item)
                else:
                    # Sort row elements horizontally
                    current_row.sort(key=lambda item: item[0][0][0])
                    rows.append(current_row)
                    current_row = [item]
                    current_y = y0
                    
            if current_row:
                current_row.sort(key=lambda item: item[0][0][0])
                rows.append(current_row)
                
            formatted_rows = []
            for r in rows:
                formatted_cells = []
                for item in r:
                    bbox, text, prob = item
                    color_str = self.detect_bbox_color(page_img_path, bbox)
                    color_val = 65280 if color_str == "green" else (16711680 if color_str == "red" else 0)
                    formatted_cells.append({"text": text, "color": color_val})
                formatted_rows.append(formatted_cells)
                
            page_transactions, page_invalid = self.parse_table_rows(formatted_rows, bank_name)
            parsed_transactions.extend(page_transactions)
            invalid_rows.extend(page_invalid)
            
            if os.path.exists(page_img_path):
                os.remove(page_img_path)
                
        doc.close()
        return parsed_transactions, invalid_rows, bank_name

    def is_sbi_statement(self, text: str) -> bool:
        text_lower = text.lower()
        sbi_signals = [
            "state bank of india",
            "sbin0",
            "sbin",
            "sbi branch",
            "sbi.co.in",
            "cif no",
            "cif number",
            "onlinesbi",
            "posb",
            "sbi account",
            "statement of account"
        ]
        count = sum(1 for sig in sbi_signals if sig in text_lower)
        return count >= 1 and ("sbi" in text_lower or "state bank" in text_lower)

    def clean_merchant_name(self, raw_name: str) -> str:
        if not raw_name:
            return "Unknown Merchant"
        # Remove VPA handles e.g. @okicici, @paytm, @ybl
        cleaned = re.sub(r'@[a-zA-Z0-9.-]+', '', raw_name)
        cleaned = re.sub(r'^(?:by|to|transfer|txn|ref|val|chq|pay)\s+', '', cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.replace('/', ' ').replace('-', ' ').replace('_', ' ').replace(':', ' ').strip()
        words = [w for w in cleaned.split() if len(w) > 1 and not w.isdigit()]
        if not words:
            return raw_name[:25].strip()
        candidate = " ".join(words[:3]).title()
        
        c_lower = candidate.lower()
        if "amazon" in c_lower: return "Amazon Pay"
        if "swiggy" in c_lower: return "Swiggy"
        if "zomato" in c_lower: return "Zomato"
        if "phonepe" in c_lower: return "PhonePe"
        if "gpay" in c_lower or "google" in c_lower: return "Google Pay"
        if "paytm" in c_lower: return "Paytm"
        if "uber" in c_lower: return "Uber"
        if "ola" in c_lower: return "Ola"
        if "flipkart" in c_lower: return "Flipkart"
        if "myntra" in c_lower: return "Myntra"
        if "netflix" in c_lower: return "Netflix"
        if "spotify" in c_lower: return "Spotify"
        if "jio" in c_lower: return "Jio Recharge"
        if "airtel" in c_lower: return "Airtel"
        
        return candidate[:30].strip()

    def extract_sbi_merchant_and_ref(self, desc: str) -> tuple:
        desc_clean = desc.strip()
        ref_num = None
        merchant = "SBI Transaction"
        
        # 1. UPI Pattern: UPI/123456789012/SWIGGY/paytm... or UPI/CR/123456789012/AMAZON PAY/...
        upi_match = re.search(r'UPI/(?:[A-Z0-9]+/)?(\d{12})/([^/]+)', desc_clean, re.IGNORECASE)
        if upi_match:
            ref_num = upi_match.group(1)
            raw_merchant = upi_match.group(2).strip()
            merchant = self.clean_merchant_name(raw_merchant)
            return merchant, ref_num

        # 2. NEFT Pattern: NEFT CR-SALARY-COMP... or NEFT N25026291039...
        neft_match = re.search(r'NEFT\s+(?:CR|DR)?\s*[-/]?\s*([A-Z0-9]+)?\s*[-/]?\s*(.*)', desc_clean, re.IGNORECASE)
        if neft_match:
            ref_num = neft_match.group(1) if neft_match.group(1) and len(neft_match.group(1)) > 6 else None
            raw_m = neft_match.group(2) or desc_clean
            merchant = self.clean_merchant_name(raw_m)
            if "salary" in desc_clean.lower():
                merchant = "Salary"
            return merchant, ref_num

        # 3. IMPS Pattern: IMPS/P2A/426810293810/...
        imps_match = re.search(r'IMPS/(?:[A-Z0-9]+/)?(\d{12})/([^/]+)', desc_clean, re.IGNORECASE)
        if imps_match:
            ref_num = imps_match.group(1)
            merchant = self.clean_merchant_name(imps_match.group(2))
            return merchant, ref_num

        # 4. ATM WDL: ATM WDL 4567 BANGALORE
        if "atm wdl" in desc_clean.lower() or "atm withdrawal" in desc_clean.lower():
            return "ATM Withdrawal", self.extract_ref_number(desc_clean)

        # 5. POS: POS 456789 ZOMATO BANGALORE
        pos_match = re.search(r'POS\s+(?:\d+\s+)?([A-Za-z0-9\s]+)', desc_clean, re.IGNORECASE)
        if pos_match:
            return self.clean_merchant_name(pos_match.group(1)), self.extract_ref_number(desc_clean)

        # 6. Salary / Interest / Charges
        if any(k in desc_clean.lower() for k in ["salary", "payroll"]):
            return "Salary", self.extract_ref_number(desc_clean)
        if any(k in desc_clean.lower() for k in ["interest credit", "int.paid"]):
            return "SBI Interest", self.extract_ref_number(desc_clean)

        ref_num = self.extract_ref_number(desc_clean)
        merchant = self.extract_merchant(desc_clean)
        return merchant, ref_num

    def parse_sbi_pdf(self, pdf_path: str, is_scanned: bool = False) -> tuple:
        if is_scanned:
            txs, invalid, bank = self.parse_scanned_pdf(pdf_path)
            for t in txs:
                t["bank"] = "SBI"
            return txs, invalid, 85

        doc = fitz.open(pdf_path)
        all_transactions = []
        all_invalid = []

        # Multi-page SBI PDF extraction
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            raw_rows = self.extract_rows_from_pymupdf(page)
            
            # Assembly of wrapped multiline rows
            assembled_tx_rows = []
            
            for r in raw_rows:
                # Filter out disclaimers, repeated headers, page footers
                row_text = " ".join(cell["text"] for cell in r).lower()
                if any(hdr in row_text for hdr in [
                    "account number", "cif no", "statement period", "ifs code", 
                    "computer generated", "page no", "page 1 of", "page 2 of",
                    "state bank of india", "statement of account"
                ]):
                    continue
                
                # Check for SBI header row: Date / Particulars / Ref No / Debit / Credit / Balance
                temp_headers = self.find_headers(r)
                if len(temp_headers) >= 3:
                    continue
                
                # Check if row starts with valid SBI date (DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD Mon YYYY)
                first_cell_text = r[0]["text"].strip() if r else ""
                parsed_date = self.parse_date(first_cell_text)
                
                if parsed_date:
                    assembled_tx_rows.append({
                        "date_cell": first_cell_text,
                        "date_parsed": parsed_date,
                        "text_spans": list(r)
                    })
                elif assembled_tx_rows:
                    # Continuation line for wrapped SBI transaction description
                    last_tx = assembled_tx_rows[-1]
                    for cell in r:
                        last_tx["text_spans"].append(cell)
                        
            # Parse assembled transaction rows
            for tx_entry in assembled_tx_rows:
                parsed_date = tx_entry["date_parsed"]
                spans = tx_entry["text_spans"]
                
                desc_parts = []
                numbers_found = []
                
                is_debit = False
                is_credit = False
                
                for cell in spans:
                    t_text = cell["text"].strip()
                    if not t_text:
                        continue
                    
                    if self.parse_date(t_text) and not desc_parts:
                        continue
                        
                    t_lower = t_text.lower()
                    if "dr" in t_lower or "debit" in t_lower:
                        is_debit = True
                    if "cr" in t_lower or "credit" in t_lower:
                        is_credit = True
                        
                    num = self.parse_amount(t_text)
                    if num > 0 and (re.search(r'\d', t_text)):
                        numbers_found.append({"val": num, "raw": t_text, "color": cell.get("color")})
                    else:
                        desc_parts.append(t_text)
                        
                full_description = " ".join(desc_parts).strip()
                if not full_description:
                    full_description = "SBI Transaction"
                    
                merchant, ref_number = self.extract_sbi_merchant_and_ref(full_description)
                
                amount = 0.0
                balance_val = None
                tx_type = "expense"
                
                if numbers_found:
                    # In SBI tables, if >= 2 numbers exist: [..., Amount, Balance]
                    if len(numbers_found) >= 2:
                        balance_val = numbers_found[-1]["val"]
                        amount = numbers_found[-2]["val"]
                        raw_amt_str = numbers_found[-2]["raw"].lower()
                    else:
                        amount = numbers_found[0]["val"]
                        raw_amt_str = numbers_found[0]["raw"].lower()
                        
                    # Transaction type detection rules (Debit vs Credit)
                    if "cr" in raw_amt_str or "credit" in raw_amt_str or is_credit or self.check_description_for_income(full_description):
                        tx_type = "income"
                    elif "dr" in raw_amt_str or "debit" in raw_amt_str or is_debit:
                        tx_type = "expense"
                    else:
                        amt_color = self.get_text_color_type(numbers_found[0].get("color"))
                        tx_type = self.determine_type_from_text_and_color(raw_amt_str, full_description, amt_color)
                        
                if amount <= 0:
                    continue
                    
                specific_type = self.classify_specific_type(full_description, tx_type)
                category = self.classify_category(full_description, specific_type)
                payment_method = self.detect_payment_method(full_description)
                
                tx_id = ref_number or f"SBI-{parsed_date.strftime('%Y%m%d')}-{int(amount)}"
                
                all_transactions.append({
                    "date": parsed_date.strftime("%Y-%m-%d"),
                    "time": None,
                    "amount": amount,
                    "type": tx_type,
                    "merchant": merchant,
                    "description": full_description,
                    "transaction_id": tx_id,
                    "reference_number": ref_number or tx_id,
                    "balance": balance_val,
                    "payment_method": payment_method,
                    "bank": "SBI",
                    "category": category,
                    "source_type": "PDF"
                })

        doc.close()
        confidence = 96 if all_transactions else 70
        return all_transactions, all_invalid, confidence

    def parse_pdf(self, pdf_path: str) -> dict:
        is_scanned = self.is_scanned_pdf(pdf_path)
        
        parsed_transactions = []
        invalid_rows = []
        bank_name = "Generic PDF"
        confidence_score = 90
        
        # Read text to check bank signature
        all_text = ""
        try:
            doc = fitz.open(pdf_path)
            for page in doc:
                all_text += page.get_text() + "\n"
            doc.close()
        except Exception:
            pass
            
        is_sbi = self.is_sbi_statement(all_text)
        
        if is_sbi:
            bank_name = "State Bank of India"
            parsed_transactions, invalid_rows, confidence_score = self.parse_sbi_pdf(pdf_path, is_scanned)
        elif is_scanned:
            parsed_transactions, invalid_rows, bank_name = self.parse_scanned_pdf(pdf_path)
            confidence_score = 80
        else:
            parsed_transactions, invalid_rows, bank_name = self.parse_selectable_pdf(pdf_path)
            confidence_score = 92
            
        return {
            "transactions": parsed_transactions,
            "invalid_rows": invalid_rows,
            "bank": bank_name,
            "is_sbi": is_sbi,
            "is_scanned": is_scanned,
            "confidence_score": confidence_score
        }

pdf_parser = PDFStatementParser()

