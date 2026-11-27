from app.services.bank_parsers.base_parser import BaseBankParser
from app.services.bank_parsers.sbi_parser import SBIBankParser
from app.services.bank_parsers.hdfc_parser import HDFCBankParser
from app.services.bank_parsers.icici_parser import ICICIBankParser
from app.services.bank_parsers.axis_parser import AxisBankParser

PARSERS = {
    "sbi": SBIBankParser,
    "state bank of india": SBIBankParser,
    "hdfc": HDFCBankParser,
    "hdfc bank": HDFCBankParser,
    "icici": ICICIBankParser,
    "icici bank": ICICIBankParser,
    "axis": AxisBankParser,
    "axis bank": AxisBankParser,
}

def get_bank_parser(bank_name: str) -> BaseBankParser:
    """Factory function returning appropriate bank parser based on bank name string."""
    normalized = bank_name.strip().lower()
    parser_cls = PARSERS.get(normalized, SBIBankParser)
    return parser_cls()

__all__ = [
    "BaseBankParser",
    "SBIBankParser",
    "HDFCBankParser",
    "ICICIBankParser",
    "AxisBankParser",
    "get_bank_parser",
]
