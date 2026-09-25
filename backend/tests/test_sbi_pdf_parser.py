import pytest
from app.services.pdf_parser import pdf_parser

def test_sbi_bank_detection():
    sample_text = """
    STATE BANK OF INDIA
    BRANCH: BANGALORE MAIN BRANCH
    IFS CODE: SBIN0000813
    CIF NO: 85920192039
    STATEMENT OF ACCOUNT FOR PERIOD 01/09/2026 TO 25/09/2026
    """
    assert pdf_parser.is_sbi_statement(sample_text) is True

def test_sbi_merchant_and_ref_extraction():
    # 1. UPI Swiggy
    desc1 = "UPI/123456789012/SWIGGY/swiggy@paytm/PAYMENT FOR FOOD"
    merch1, ref1 = pdf_parser.extract_sbi_merchant_and_ref(desc1)
    assert merch1 == "Swiggy"
    assert ref1 == "123456789012"

    # 2. UPI Amazon Pay
    desc2 = "UPI/CR/987654321098/AMAZON PAY/amazon@apl"
    merch2, ref2 = pdf_parser.extract_sbi_merchant_and_ref(desc2)
    assert merch2 == "Amazon Pay"
    assert ref2 == "987654321098"

    # 3. NEFT Salary
    desc3 = "NEFT CR-SALARY FOR SEPTEMBER-TECH CORP-N25026291039"
    merch3, ref3 = pdf_parser.extract_sbi_merchant_and_ref(desc3)
    assert merch3 == "Salary"

    # 4. ATM Withdrawal
    desc4 = "ATM WDL 4567 MG ROAD BANGALORE"
    merch4, ref4 = pdf_parser.extract_sbi_merchant_and_ref(desc4)
    assert merch4 == "ATM Withdrawal"

def test_sbi_amount_and_date_parsing():
    date_str = "05/09/2026"
    parsed_date = pdf_parser.parse_date(date_str)
    assert parsed_date is not None
    assert parsed_date.strftime("%Y-%m-%d") == "2026-09-05"

    amt_str1 = "₹1,299.50"
    assert pdf_parser.parse_amount(amt_str1) == 1299.50

    amt_str2 = "45,821.00"
    assert pdf_parser.parse_amount(amt_str2) == 45821.00

def test_debit_credit_type_classification():
    # Credit marker
    type1 = pdf_parser.determine_type_from_text_and_color("5,000.00 CR", "BY TRANSFER-INB Salary", "black")
    assert type1 == "income"

    # Debit marker
    type2 = pdf_parser.determine_type_from_text_and_color("750.00 DR", "TO UPI/SWIGGY", "black")
    assert type2 == "expense"
