from app.services.bank_parsers import get_bank_parser, SBIBankParser, HDFCBankParser, ICICIBankParser, AxisBankParser

def test_parser_factory():
    sbi = get_bank_parser("State Bank of India")
    assert isinstance(sbi, SBIBankParser)
    
    hdfc = get_bank_parser("HDFC Bank")
    assert isinstance(hdfc, HDFCBankParser)
    
    icici = get_bank_parser("ICICI")
    assert isinstance(icici, ICICIBankParser)

    axis = get_bank_parser("Axis Bank")
    assert isinstance(axis, AxisBankParser)

def test_parser_empty_content_graceful_handling():
    parser = SBIBankParser()
    res = parser.parse(b"invalid content")
    assert isinstance(res, list)
    assert len(res) == 0
