import csv
import re
import hashlib
import json
import os
from io import StringIO

class TransactionParser:
    # Hier speichern wir das Mapping im Speicher (Cache), 
    # damit wir die JSON-Datei nicht für jede CSV-Zeile neu von der Festplatte lesen müssen.
    _mapping = None

    @classmethod
    def load_mapping(cls, filepath=None):
        """Lädt die mapping.json nur einmalig in den Arbeitsspeicher."""
        if cls._mapping is None:
            # Resolve default mapping next to this file, independent from current working dir.
            if filepath is None:
                filepath = os.path.join(os.path.dirname(__file__), "mapping.json")

            if not os.path.exists(filepath):
                raise FileNotFoundError(f"Die Mapping-Datei '{filepath}' wurde nicht gefunden.")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                cls._mapping = json.load(f)
        return cls._mapping

    @classmethod
    def parse_csv(cls, csv_content_str: str):
        # ... (Schritt 1 bleibt genau gleich wie vorher, Zeilen verschmelzen) ...
        f = StringIO(csv_content_str.strip())
        reader = csv.DictReader(f, delimiter=';')
        
        raw_transactions = []
        current_tx = None
        
        for row in reader:
            if row.get('IBAN') and row['IBAN'].strip():
                if current_tx:
                    raw_transactions.append(current_tx)
                current_tx = {
                    'iban': row['IBAN'].strip(),
                    'booked_at': row['Booked At'].strip(),
                    'text': row['Text'].strip(),
                    'amount': float(row['Credit/Debit Amount'].strip() or 0),
                }
            elif current_tx and row.get('Text'):
                sub_text = row['Text'].strip()
                if sub_text:
                    current_tx['text'] += f" | {sub_text}"
        
        if current_tx:
            raw_transactions.append(current_tx)
            
        # --- SCHRITT 2: Daten bereinigen (jetzt mit cls. statt staticmethod) ---
        parsed_data = []
        for tx in raw_transactions:
            parsed_data.append(cls._clean_transaction(tx))
            
        return parsed_data

    @classmethod
    def _clean_transaction(cls, tx):
        raw_text = tx['text']
        amount = tx['amount']
        date_clean = tx['booked_at'].split(' ')[0]
        
        # 1. STOP-WORDS ENTFERNEN (Bank-Müll rausfiltern)
        stopwords = [
            r'Acquisto\s*', r'Accredito\s*', r'Pagamento\s*', r'TWINT\s*', 
            r'SIX PAYMENT SERVICES.*', r'KARTENZAHLUNG\s*', r'CHF\s*\d+\.\d+', 
            r'\|'
        ]
        
        cleaned_string = raw_text
        for word in stopwords:
            cleaned_string = re.sub(word, ' ', cleaned_string, flags=re.IGNORECASE)
            
        cleaned_string = cleaned_string.replace(',', ' ')
        cleaned_string = ' '.join(cleaned_string.split()).strip()

        # 2. JSON MAPPING LADEN & ANWENDEN
        mapping = cls.load_mapping() # Lädt die mapping.json
        
        category_name = "Others"
        merchant_name = cleaned_string # Fallback ist der bereinigte Text (z.B. "NIKOLIC NIKOLA")
        
        for cat, pattern in mapping.items():
            # Wir suchen im originalen raw_text nach dem Regex-Pattern aus der JSON
            match = re.search(f'({pattern})', raw_text, re.IGNORECASE)
            if match:
                category_name = cat
                # Magie: Aus "coop" wird "Coop"
                merchant_name = match.group(1).title() 
                break
        
        # 3. IMPORT HASH
        hash_input = f"{tx['iban']}-{date_clean}-{amount}-{raw_text}"
        import_hash = hashlib.md5(hash_input.encode()).hexdigest()
        
        return {
            "iban": tx['iban'],
            "booked_at": date_clean,
            "amount": amount,
            "merchant": merchant_name,   # Z.B. "Coop"
            "category_name": category_name, # Z.B. "Groceries"
            "raw_text": raw_text,        
            "import_hash": import_hash
        }
