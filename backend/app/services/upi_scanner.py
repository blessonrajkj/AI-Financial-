import os
import re
import cv2
import numpy as np
from datetime import datetime
from app.services.ocr_service import ocr_service
from app.services.category_taxonomy import auto_categorize

class UPIScreenshotScanner:
    def __init__(self):
        # List of common Indian banks
        self.banks_list = [
            "SBI", "State Bank of India", "HDFC", "ICICI", "Axis", "PNB", "BOB", 
            "Kotak", "Paytm Payments Bank", "Federal Bank", "Canara", "Union Bank",
            "IDFC First", "IndusInd", "Yes Bank", "Indian Bank", "UCO Bank"
        ]

    def preprocess_image(self, file_path: str) -> np.ndarray | None:
        try:
            img = cv2.imread(file_path)
            if img is None:
                return None
            
            # 1. Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # 2. Resize image 2x
            resized = cv2.resize(gray, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
            
            # 3. Auto contrast using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            contrast = clahe.apply(resized)
            
            # 4. Denoise
            denoised = cv2.fastNlMeansDenoising(contrast, h=3)
            
            # 5. Sharpening filter
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            sharpened = cv2.filter2D(denoised, -1, kernel)
            
            # 6. Adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            return thresh
        except Exception as e:
            print(f"UPI Image preprocessing failed: {e}")
            return None

    def scan_screenshot(self, file_path: str) -> dict:
        result = {
            "amount": None,
            "merchant": "Unknown Recipient",
            "type": "Expense",  # Expense or Income
            "category": "Miscellaneous",
            "subcategory": "Other",
            "date": datetime.now().strftime("%d-%m-%Y"),
            "time": datetime.now().strftime("%I:%M %p"),
            "upi_id": None,
            "transaction_id": None,
            "bank_name": "UPI Linked Bank",
            "status": "Success",
            "payment_method": "UPI",
            "currency": "INR",
            "payment_app": "Generic UPI",
            "confidence_score": 95.0,
            "raw_text": "",
            "needs_review": False,
            "review_fields": []
        }

        if not os.path.exists(file_path):
            return result

        reader = ocr_service._get_reader()
        if not reader or reader == "fallback":
            return result

        try:
            processed = self.preprocess_image(file_path)
            # Use EasyOCR with paragraph=True and detail=1
            if processed is not None:
                ocr_results = reader.readtext(processed, paragraph=True, detail=1)
            else:
                ocr_results = reader.readtext(file_path, paragraph=True, detail=1)
        except Exception as e:
            print(f"EasyOCR scanning error: {e}")
            return result

        extracted_lines = []
        confidences = []
        
        for result_item in ocr_results:
            if len(result_item) == 3:
                bbox, text, prob = result_item
                confidences.append(prob)
            elif len(result_item) == 2:
                bbox, text = result_item
                confidences.append(0.9)
            else:
                continue
                
            text_str = text.strip()
            if text_str:
                extracted_lines.append(text_str)

        raw_text = "\n".join(extracted_lines)
        
        # 1. Normalize OCR text (Step 1)
        normalized_text = raw_text.replace("₹", "").replace("Rs.", "").replace("Rs", "").replace("INR", "")

        # 6. Print debugging logs (Step 6)
        print("RAW OCR:")
        print(raw_text)
        print("\nNormalized OCR:")
        print(normalized_text)

        result["raw_text"] = self.mask_sensitive_data(raw_text)

        # Classify Transaction Type
        if re.search(r"received\s+from", raw_text, re.IGNORECASE):
            result["type"] = "Income"
        elif re.search(r"paid\s+to", raw_text, re.IGNORECASE):
            result["type"] = "Expense"

        # Identify Payment App
        app_text = raw_text.lower()
        if "google pay" in app_text or "gpay" in app_text or "g pay" in app_text:
            result["payment_app"] = "Google Pay"
        elif "phonepe" in app_text or "phone pe" in app_text:
            result["payment_app"] = "PhonePe"
        elif "paytm" in app_text or "pay tm" in app_text:
            result["payment_app"] = "Paytm"
        elif "bhim" in app_text:
            result["payment_app"] = "BHIM UPI"
        elif "amazon pay" in app_text or "amazonpay" in app_text:
            result["payment_app"] = "Amazon Pay"
        elif "cred" in app_text:
            result["payment_app"] = "CRED"
        elif "supermoney" in app_text or "super money" in app_text:
            result["payment_app"] = "SuperMoney"
        elif "navi" in app_text:
            result["payment_app"] = "Navi UPI"
        elif "whatsapp" in app_text:
            result["payment_app"] = "WhatsApp Pay"

        # 3. Extract Amount using generic regex (Step 3)
        amount_match = None
        
        # Regex that supports commas, decimals, or integers:
        # (?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)
        amount_pattern = r"(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)"
        
        # Search every line for this pattern first
        for line in extracted_lines:
            match = re.search(amount_pattern, line, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(",", "").strip()
                try:
                    val = float(amount_str)
                    if 1.0 <= val <= 1000000.0:
                        amount_match = val
                        break
                except ValueError:
                    pass

        # 5. Fallback scan if regex fails (Step 5)
        if not amount_match:
            for line in extracted_lines:
                if any(ind in line for ind in ["₹", "Rs", "INR"]) or re.search(r"\d+,\d+", line):
                    # Extract the numeric block from this specific line
                    num_match = re.search(r"([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)", line)
                    if num_match:
                        num_str = num_match.group(1).replace(",", "").strip()
                        try:
                            val = float(num_str)
                            if 1.0 <= val <= 1000000.0:
                                amount_match = val
                                break
                        except ValueError:
                            pass

        # Ultimate fallback scan (checks any decimal block)
        if not amount_match:
            digit_blocks = re.findall(r"\b\d+(?:,\d+)*(?:\.\d{2})?\b", normalized_text)
            for block in digit_blocks:
                block_clean = block.replace(",", "").strip()
                try:
                    val = float(block_clean)
                    if 1.0 <= val <= 1000000.0:
                        amount_match = val
                        break
                except ValueError:
                    pass

        # Save detected amount (Step 4)
        if amount_match:
            result["amount"] = amount_match

        # Print detected amount debug log (Step 6)
        print(f"\nDetected Amount:\n{amount_match}")
        print("--------------------------------")

        # 8. Merchant Detection (Step 8)
        merchant_name = None
        lines_clean = [l.strip() for l in raw_text.splitlines() if l.strip()]
        
        for idx, line in enumerate(lines_clean):
            if line.lower() == "paid to" or line.lower().startswith("paid to"):
                # If there's text after "paid to" on the same line, use it
                cand = line[7:].strip()
                if len(cand) > 1:
                    merchant_name = cand
                    break
                # Otherwise, grab the next non-empty line
                if idx + 1 < len(lines_clean):
                    merchant_name = lines_clean[idx + 1]
                    break
            elif line.lower() == "received from" or line.lower().startswith("received from"):
                cand = line[13:].strip()
                if len(cand) > 1:
                    merchant_name = cand
                    break
                if idx + 1 < len(lines_clean):
                    merchant_name = lines_clean[idx + 1]
                    break

        # Fallback to context searching if "Paid to" logic wasn't triggered
        if not merchant_name:
            for idx, line in enumerate(lines_clean):
                if "paid to" in line.lower():
                    # Looser substring match
                    parts = re.split(r"paid\s+to", line, flags=re.IGNORECASE)
                    if len(parts) > 1 and len(parts[1].strip()) > 1:
                        merchant_name = parts[1].strip()
                        break
                    elif idx + 1 < len(lines_clean):
                        merchant_name = lines_clean[idx + 1]
                        break

        # Additional fallback
        if not merchant_name:
            filtered_lines = [
                l for l in lines_clean 
                if not any(w in l.lower() for w in ["successful", "failed", "completed", "rs.", "₹", "upi", "utr", "transaction"])
            ]
            if len(filtered_lines) > 0:
                merchant_name = filtered_lines[0]

        if merchant_name:
            result["merchant"] = re.sub(r"[^a-zA-Z0-9\s.-]", "", merchant_name).strip()[:40]
        else:
            result["merchant"] = "Unknown Recipient"

        # UPI Parser
        upi_pattern = r"\b([a-zA-Z0-9.-_]+@(?:ybl|okaxis|oksbi|ibl|upi|okhdfcbank|okicici|paytm|axl|fbl|kotak|[a-zA-Z0-9.-]+))\b"
        for line in lines_clean:
            match = re.search(upi_pattern, line, re.IGNORECASE)
            if match:
                result["upi_id"] = match.group(1)
                break

        # Transaction ID / UTR No / Ref No
        utr_pattern = r"\b(\d{12})\b"
        for line in lines_clean:
            match = re.search(utr_pattern, line)
            if match:
                result["transaction_id"] = match.group(1)
                break

        if not result["transaction_id"]:
            txn_pattern = r"(?:txn|transaction|ref|utr)(?:\s*id|no|num|number)?\s*[:\s-]*\s*([a-zA-Z0-9]+)"
            for line in lines_clean:
                match = re.search(txn_pattern, line, re.IGNORECASE)
                if match:
                    result["transaction_id"] = match.group(1)
                    break

        # Bank Name
        for line in lines_clean:
            for bank in self.banks_list:
                if bank.lower() in line.lower():
                    result["bank_name"] = bank
                    break
            if result["bank_name"] != "UPI Linked Bank":
                break

        # Date & Time
        date_patterns = [
            r"(\d{2}[-/]\d{2}[-/]\d{4})",
            r"(\d{4}[-/]\d{2}[-/]\d{2})",
            r"(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})"
        ]
        time_patterns = [
            r"(\d{1,2}:\d{2}\s*(?:PM|AM|pm|am))",
            r"(\d{1,2}:\d{2}:\d{2})",
            r"(\d{1,2}:\d{2})"
        ]
        
        for line in lines_clean:
            for dp in date_patterns:
                d_match = re.search(dp, line)
                if d_match:
                    result["date"] = d_match.group(1)
                    break
            for tp in time_patterns:
                t_match = re.search(tp, line)
                if t_match:
                    result["time"] = t_match.group(1)
                    break

        # Status
        status_text = raw_text.lower()
        if "fail" in status_text or "declined" in status_text:
            result["status"] = "Failed"
        elif "cancel" in status_text:
            result["status"] = "Cancelled"
        elif "pending" in status_text or "processing" in status_text:
            result["status"] = "Pending"

        # Category & Subcategory Taxonomy Mapping
        calc_type, main_cat, sub_cat = auto_categorize(result["type"].lower(), result["merchant"], result["raw_text"])
        result["category"] = main_cat
        result["subcategory"] = sub_cat
        if calc_type == "transfer":
            result["type"] = "Transfer"
        elif calc_type == "income":
            result["type"] = "Income"
        else:
            result["type"] = "Expense"

        # Confidence score
        base_confidence = 100.0
        missing_fields = []
        if not result["amount"]:
            base_confidence -= 35
            missing_fields.append("amount")
        if not result["merchant"] or result["merchant"] == "Unknown Recipient":
            base_confidence -= 20
            missing_fields.append("merchant")
        if not result["transaction_id"]:
            base_confidence -= 15
            missing_fields.append("transaction_id")
        if not result["upi_id"]:
            base_confidence -= 10
            missing_fields.append("upi_id")

        if confidences:
            ocr_avg = (sum(confidences) / len(confidences)) * 100.0
            final_conf = (base_confidence * 0.7) + (ocr_avg * 0.3)
        else:
            final_conf = base_confidence

        result["confidence_score"] = round(max(10.0, min(100.0, final_conf)), 1)
        if result["confidence_score"] < 80.0:
            result["needs_review"] = True
            result["review_fields"] = missing_fields

        return result

    def auto_classify(self, merchant: str, raw_text: str) -> str:
        text = f"{merchant} {raw_text}".lower()
        
        # Swiggy/Zomato -> Food, Amazon -> Shopping, Netflix -> Subscriptions, Salary -> Salary
        if "swiggy" in text or "zomato" in text or "dominos" in text or "kfc" in text or "mcdonalds" in text:
            return "Food"
        elif "amazon" in text or "flipkart" in text or "myntra" in text or "meesho" in text:
            return "Shopping"
        elif "netflix" in text or "spotify" in text or "youtube" in text or "premium" in text or "prime" in text:
            return "Subscriptions"
        elif "salary" in text or "payroll" in text or "stipend" in text:
            return "Salary"
        elif "uber" in text or "ola" in text or "rapido" in text or "transport" in text:
            return "Transportation"
        elif "electricity" in text or "eb bill" in text or "water bill" in text or "utilities" in text or "bill pay" in text:
            return "Utilities"
        elif "medical" in text or "apollo" in text or "pharmacy" in text or "healthcare" in text:
            return "Healthcare"
        
        # Personal names -> Transfer
        words = merchant.strip().split()
        if len(words) >= 2 and len(words) <= 3:
            is_personal = True
            corporate_words = ["pvt", "ltd", "inc", "technologies", "services", "store", "shop", "supermarket", "pay", "bank", "merchant", "seller", "office", "outlet"]
            for w in words:
                if len(w) == 0 or w.lower() in corporate_words or not w[0].isupper():
                    is_personal = False
                    break
            if is_personal:
                return "Transfer"

        return "Miscellaneous"

    def mask_sensitive_data(self, text: str) -> str:
        text = re.sub(r"\b(?:pin|otp)[:\s-]*\d{4,6}\b", "PIN: ****", text, flags=re.IGNORECASE)
        def mask_account(match):
            digits = match.group(1)
            return "****" + digits[-4:]
        text = re.sub(r"\b(?:a/c|account|acc)(?:\s*no)?[:\s-]*(\d{9,18})\b", mask_account, text, flags=re.IGNORECASE)
        text = re.sub(r"\bcvv[:\s-]*\d{3}\b", "CVV: ***", text, flags=re.IGNORECASE)
        return text

upi_scanner = UPIScreenshotScanner()
