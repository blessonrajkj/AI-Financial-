from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseBankParser(ABC):
    """Abstract Base Class for pluggable bank statement parsers."""
    
    def __init__(self, bank_name: str):
        self.bank_name = bank_name

    @abstractmethod
    def parse(self, content_bytes: bytes, password: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Parse raw file content (PDF or CSV) into standardized transaction records.
        Returns a list of dicts with keys:
          - date (datetime)
          - description (str)
          - amount (Decimal/float)
          - type ('income' | 'expense')
          - debit_amount (float)
          - credit_amount (float)
          - balance (float)
          - reference_number (str)
          - bank (str)
        """
        pass
