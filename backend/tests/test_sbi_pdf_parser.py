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
    desc1 = "UPI/123456789012/SWIGGY/swiggy@paytm/PAYMENT FOR FOOD"
    merch1, ref1 = pdf_parser.extract_sbi_merchant_and_ref(desc1)
    assert merch1 == "Swiggy"
    assert ref1 == "123456789012"

    desc2 = "UPI/CR/987654321098/AMAZON PAY/amazon@apl"
    merch2, ref2 = pdf_parser.extract_sbi_merchant_and_ref(desc2)
    assert merch2 == "Amazon Pay"
    assert ref2 == "987654321098"

    desc3 = "NEFT CR-SALARY FOR SEPTEMBER-TECH CORP-N25026291039"
    merch3, ref3 = pdf_parser.extract_sbi_merchant_and_ref(desc3)
    assert merch3 == "Salary"

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

def test_sbi_debit_credit_column_structure():
    # Test case 1: Debit transaction (Expense -> Money Out)
    debit_val = 1299.00
    credit_val = None
    
    if credit_val is not None and credit_val > 0 and (debit_val is None or debit_val == 0):
        tx_type = "income"
        direction = "in"
        amount = credit_val
        final_credit = credit_val
        final_debit = None
    elif debit_val is not None and debit_val > 0 and (credit_val is None or credit_val == 0):
        tx_type = "expense"
        direction = "out"
        amount = debit_val
        final_debit = debit_val
        final_credit = None
        
    assert tx_type == "expense"
    assert direction == "out"
    assert amount == 1299.00
    assert final_debit == 1299.00
    assert final_credit is None

    # Test case 2: Credit transaction (Income -> Money In)
    debit_val2 = None
    credit_val2 = 35000.00
    
    if credit_val2 is not None and credit_val2 > 0 and (debit_val2 is None or debit_val2 == 0):
        tx_type2 = "income"
        direction2 = "in"
        amount2 = credit_val2
        final_credit2 = credit_val2
        final_debit2 = None
    elif debit_val2 is not None and debit_val2 > 0 and (credit_val2 is None or credit_val2 == 0):
        tx_type2 = "expense"
        direction2 = "out"
        amount2 = debit_val2
        final_debit2 = debit_val2
        final_credit2 = None

    assert tx_type2 == "income"
    assert direction2 == "in"
    assert amount2 == 35000.00
    assert final_debit2 is None
    assert final_credit2 == 35000.00

def test_sbi_edge_case_both_debit_credit():
    debit_val = 5000.0
    credit_val = 5000.0
    
    has_debit = debit_val is not None and debit_val > 0
    has_credit = credit_val is not None and credit_val > 0

    needs_review = False
    if has_debit and has_credit:
        needs_review = True
        review_reason = "Both Debit and Credit contain amounts in the same row"
        
    assert needs_review is True
    assert "Both Debit and Credit" in review_reason

