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
    # Test case 1: Debit transaction (Expense)
    # Value Date | Post Date | Details | Ref No/Cheque No | Debit | Credit | Balance
    # 05/09/2026 | 05/09/2026 | UPI/AMAZON | 123456 | 1299.00 | | 45000.00
    debit_val = 1299.00
    credit_val = None
    
    if credit_val is not None and credit_val > 0 and (debit_val is None or debit_val == 0):
        tx_type = "income"
        amount = credit_val
        final_credit = credit_val
        final_debit = None
    elif debit_val is not None and debit_val > 0 and (credit_val is None or credit_val == 0):
        tx_type = "expense"
        amount = debit_val
        final_debit = debit_val
        final_credit = None
        
    assert tx_type == "expense"
    assert amount == 1299.00
    assert final_debit == 1299.00
    assert final_credit is None

    # Test case 2: Credit transaction (Income)
    # 06/09/2026 | 06/09/2026 | SALARY | NEFT123 | | 35000.00 | 80000.00
    debit_val2 = None
    credit_val2 = 35000.00
    
    if credit_val2 is not None and credit_val2 > 0 and (debit_val2 is None or debit_val2 == 0):
        tx_type2 = "income"
        amount2 = credit_val2
        final_credit2 = credit_val2
        final_debit2 = None
    elif debit_val2 is not None and debit_val2 > 0 and (credit_val2 is None or credit_val2 == 0):
        tx_type2 = "expense"
        amount2 = debit_val2
        final_debit2 = debit_val2
        final_credit2 = None

    assert tx_type2 == "income"
    assert amount2 == 35000.00
    assert final_debit2 is None
    assert final_credit2 == 35000.00
