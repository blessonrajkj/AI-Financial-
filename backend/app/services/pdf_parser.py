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
            txt = cell["text"].lower()
            if any(k in txt for k in ["date", "txn dt", "tran dt", "value dt"]):
                header_map["date"] = idx
            elif any(k in txt for k in ["particulars", "description", "narration", "remarks", "details"]):
                header_map["desc"] = idx
            elif any(k in txt for k in ["chq", "ref", "cheque", "utr", "instrument", "reference"]):
                header_map["ref"] = idx
            elif any(k in txt for k in ["debit", "withdrawal", "dr", "payment"]):
                header_map["debit"] = idx
            elif any(k in txt for k in ["credit", "deposit", "cr", "receipt"]):
                header_map["credit"] = idx
            elif any(k in txt for k in ["amount", "value", "sum"]):
                header_map["amount"] = idx
            elif any(k in txt for k in ["balance", "bal", "closing"]):
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
            is_income = False
            amount_color_type = "black"
            
            # Scenario 1: Separate Debit / Credit Columns
            if debit_idx is not None and debit_idx < len(cells) and credit_idx is not None and credit_idx < len(cells):
                deb_val = self.parse_amount(cells[debit_idx]["text"])
                cre_val = self.parse_amount(cells[credit_idx]["text"])
                
                if cre_val and cre_val > 0:
                    amount = cre_val
                    tx_type = "income"
                    is_income = True
                    amount_color_type = self.get_text_color_type(cells[credit_idx]["color"])
                elif deb_val and deb_val > 0:
                    amount = deb_val
                    tx_type = "expense"
                    amount_color_type = self.get_text_color_type(cells[debit_idx]["color"])
            # Scenario 2: Single Amount Column with Suffix / Indicators
            elif amount_idx is not None and amount_idx < len(cells):
                amt_cell = cells[amount_idx]
                amount_color_type = self.get_text_color_type(amt_cell["color"])
                amt_text = amt_cell["text"]
                
                if "cr" in amt_text.lower() or "credit" in amt_text.lower() or "+" in amt_text:
                    is_income = True
                    tx_type = "income"
                elif "dr" in amt_text.lower() or "debit" in amt_text.lower() or "-" in amt_text:
                    is_income = False
                    tx_type = "expense"
                else:
                    is_income = self.check_description_for_income(desc_str)
                    tx_type = "income" if is_income else "expense"
                    
                amount = self.parse_amount(amt_text)
            else:
                # Fallback: check other cells for numerical amounts
                for c_idx in range(len(cells)):
                    if c_idx != date_idx and c_idx != desc_idx:
                        val = self.parse_amount(cells[c_idx]["text"])
                        if val > 0:
                            amount = val
                            break
            
            # Stop if amount is not found or is 0
            if not amount:
                continue
                
            # Balance
            bal_idx = current_map.get("balance", -1)
            balance = None
            if bal_idx != -1 and bal_idx < len(cells):
                balance = self.parse_amount(cells[bal_idx]["text"])
                
            # Color-based type detection override
            if amount_color_type == "green":
                tx_type = "income"
                is_income = True
            elif amount_color_type == "red":
                tx_type = "expense"
                is_income = False
                
            # Substrings type override
            desc_lower = desc_str.lower()
            if "received from" in desc_lower or "cr" in desc_lower or "credit" in desc_lower:
                tx_type = "income"
                is_income = True
            elif "paid to" in desc_lower or "dr" in desc_lower or "debit" in desc_lower:
                tx_type = "expense"
                is_income = False
                
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

    def parse_pdf(self, pdf_path: str) -> dict:
        is_scanned = self.is_scanned_pdf(pdf_path)
        
        parsed_transactions = []
        invalid_rows = []
        bank_name = "Generic PDF"
        
        if is_scanned:
            parsed_transactions, invalid_rows, bank_name = self.parse_scanned_pdf(pdf_path)
        else:
            parsed_transactions, invalid_rows, bank_name = self.parse_selectable_pdf(pdf_path)
            
        return {
            "transactions": parsed_transactions,
            "invalid_rows": invalid_rows,
            "bank": bank_name,
            "is_scanned": is_scanned
        }

pdf_parser = PDFStatementParser()
