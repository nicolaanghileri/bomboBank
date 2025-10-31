from datetime import datetime
from typing import Dict, Optional
import re

class TransactionParser:
    """
    Smart CSV transaction parser
    Handles multi-language merchant detection and categorization
    """
    
    # Merchant patterns (regex for extraction)
    MERCHANT_PATTERNS = {
        'migros': r'MIGROS',
        'coop': r'COOP',
        'sbb': r'SBB',
        'salt': r'SALT',
        'digitec': r'DIGITEC',
        'brack': r'BRACK',
        'burger_king': r'BURGER KING',
        'revolut': r'REVOLUT',
        'casino': r'CASINO',
    }
    
    # Category mappings (merchant → category)
    MERCHANT_CATEGORIES = {
        'migros': 'Groceries',
        'coop': 'Groceries',
        'sbb': 'Transport',
        'salt': 'Telecom',
        'digitec': 'Shopping',
        'brack': 'Shopping',
        'burger_king': 'Restaurant',
        'revolut': 'Other',
        'casino': 'Entertainment',
    }
    
    # Payment method detection
    PAYMENT_METHODS = {
        'twint': r'TWINT',
        'card': r'(Visa|Mastercard|Bancomat|Acquisto)',
        'transfer': r'Pagamento',
        'direct_debit': r'LSV',
        'standing_order': r'Ordine permanente',
        'cash_withdrawal': r'Prelevamento',
        'credit': r'Accredito',
    }
    
    # Category keywords (fallback if no merchant found)
    CATEGORY_KEYWORDS = {
        'Groceries': ['migros', 'coop', 'aldi', 'lidl', 'denner', 'spar'],
        'Transport': ['sbb', 'cff', 'ffs', 'taxi', 'uber', 'migrol', 'benzin', 'tankstelle'],
        'Restaurant': ['restaurant', 'pizza', 'burger', 'mcdonald', 'kfc'],
        'Shopping': ['amazon', 'zalando', 'digitec', 'brack', 'manor', 'galaxus'],
        'Housing': ['miete', 'rent', 'affitto', 'strom', 'wasser', 'verima'],
        'Telecom': ['salt', 'swisscom', 'sunrise', 'mobile', 'handy'],
        'Entertainment': ['casino', 'kino', 'cinema', 'netflix', 'spotify'],
        'Income': ['lohn', 'gehalt', 'salary', 'stipendio', 'avanta'],
    }
    
    @staticmethod
    def parse_transaction(row: Dict) -> Dict:
        """
        Main parser function
        Converts CSV row to structured transaction dict
        """
        description = row['Text']
        amount_str = row['Credit/Debit Amount']
        
        # Parse amounts
        amount = TransactionParser._parse_amount(amount_str)
        balance = TransactionParser._parse_amount(row['Balance'])
        
        # Parse dates
        booked_at = TransactionParser._parse_datetime(row['Booked At'])
        valuta_date = TransactionParser._parse_datetime(row['Valuta Date'])
        
        # Determine transaction type
        transaction_type = 'income' if amount > 0 else 'expense'
        
        # Extract payment method
        payment_method = TransactionParser._extract_payment_method(description)
        
        # Extract merchant
        merchant_name = TransactionParser._extract_merchant(description)
        
        # Determine category
        category_name = TransactionParser._determine_category(description, merchant_name)
        
        return {
            'iban': row['IBAN'].strip(),
            'booked_at': booked_at.isoformat(),
            'description': description.strip(),
            'amount': amount,
            'balance': balance,
            'valuta_date': valuta_date.date().isoformat() if valuta_date else None,
            'transaction_type': transaction_type,
            'payment_method': payment_method,
            'merchant_name': merchant_name,
            'category_name': category_name,
        }
    
    @staticmethod
    def _parse_amount(amount_str: str) -> float:
        """Clean and convert amount string to float"""
        cleaned = amount_str.replace("'", "").replace(" ", "").strip()
        
        if ',' in cleaned and '.' not in cleaned:
            cleaned = cleaned.replace(',', '.')
        elif ',' in cleaned and '.' in cleaned:
            if cleaned.rindex(',') > cleaned.rindex('.'):
                cleaned = cleaned.replace('.', '').replace(',', '.')
            else:
                cleaned = cleaned.replace(',', '')
        
        try:
            return float(cleaned)
        except ValueError:
            raise ValueError(f"Cannot parse amount: '{amount_str}'")
    
    @staticmethod
    def _parse_datetime(date_str: str) -> datetime:
        """Parse datetime string to datetime object"""
        try:
            return datetime.strptime(date_str.strip(), '%Y-%m-%d %H:%M:%S.%f')
        except ValueError:
            try:
                return datetime.strptime(date_str.split()[0], '%Y-%m-%d')
            except ValueError:
                raise ValueError(f"Cannot parse date: '{date_str}'")
    
    @staticmethod
    def _extract_payment_method(description: str) -> Optional[str]:
        """Extract payment method from description"""
        desc_upper = description.upper()
        
        for method, pattern in TransactionParser.PAYMENT_METHODS.items():
            if re.search(pattern, desc_upper):
                return method
        
        return None
    
    @staticmethod
    def _extract_merchant(description: str) -> Optional[str]:
        """Extract merchant name from description"""
        desc_upper = description.upper()
        
        # Try patterns first
        for merchant, pattern in TransactionParser.MERCHANT_PATTERNS.items():
            if re.search(pattern, desc_upper):
                match = re.search(pattern, desc_upper)
                return match.group(0).title()
        
        # Fallback: extract merchant after TWINT
        if 'TWINT' in desc_upper:
            # Format: "Acquisto TWINT MERCHANT_NAME"
            parts = description.split('TWINT')
            if len(parts) > 1:
                merchant = parts[1].strip().split(';')[0].strip()
                # Take first 3 words (usually the merchant)
                words = merchant.split()[:3]
                return ' '.join(words).title()
        
        return None
    
    @staticmethod
    def _determine_category(description: str, merchant_name: Optional[str]) -> str:
        """Determine category based on description and merchant"""
        desc_lower = description.lower()
        
        # 1. Try via merchant
        if merchant_name:
            merchant_lower = merchant_name.lower()
            for merchant_key, category in TransactionParser.MERCHANT_CATEGORIES.items():
                if merchant_key in merchant_lower:
                    return category
        
        # 2. Try via keywords
        for category, keywords in TransactionParser.CATEGORY_KEYWORDS.items():
            if any(keyword in desc_lower for keyword in keywords):
                return category
        
        # 3. Special income detection
        if any(word in desc_lower for word in ['lohn', 'gehalt', 'salary', 'stipendio', 'accredito']):
            return 'Income'
        
        # Default
        return 'Other'