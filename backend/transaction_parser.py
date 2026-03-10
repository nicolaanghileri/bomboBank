import csv
import hashlib
import json
import os
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import StringIO


class TransactionParser:
    # Mapping cache (loaded once per process)
    _mapping = None

    @classmethod
    def load_mapping(cls, filepath=None):
        """Load mapping.json once and reuse it across rows."""
        if cls._mapping is None:
            if filepath is None:
                filepath = os.path.join(os.path.dirname(__file__), "mapping.json")

            if not os.path.exists(filepath):
                raise FileNotFoundError(f"Die Mapping-Datei '{filepath}' wurde nicht gefunden.")

            with open(filepath, "r", encoding="utf-8") as f:
                cls._mapping = json.load(f)
        return cls._mapping

    @classmethod
    def parse_csv(cls, csv_content_str: str):
        f = StringIO(csv_content_str.strip())
        reader = csv.DictReader(f, delimiter=";")

        raw_transactions = []
        current_tx = None

        for row in reader:
            iban = (row.get("IBAN") or "").strip()
            text = cls._normalize_whitespace((row.get("Text") or "").strip())

            if iban:
                if current_tx:
                    raw_transactions.append(current_tx)
                current_tx = {
                    "iban": iban,
                    "booked_at": (row.get("Booked At") or "").strip(),
                    "description": text,
                    "purpose_parts": [],
                    "raw_text_parts": [text] if text else [],
                    "amount": cls._parse_amount(row.get("Credit/Debit Amount")),
                }
            elif current_tx and text:
                current_tx["purpose_parts"].append(text)
                current_tx["raw_text_parts"].append(text)

        if current_tx:
            raw_transactions.append(current_tx)

        return [cls._clean_transaction(tx) for tx in raw_transactions]

    @classmethod
    def _clean_transaction(cls, tx):
        raw_text = cls._normalize_whitespace(" | ".join(tx["raw_text_parts"]))
        description = tx.get("description") or raw_text
        purpose = cls._normalize_whitespace(" | ".join(tx.get("purpose_parts", []))) or None
        if not purpose:
            purpose = cls._infer_purpose(description)

        amount = tx["amount"]
        date_clean = (tx.get("booked_at") or "").split(" ")[0]
        currency = cls._extract_currency(raw_text)
        merchant_name = cls._extract_merchant(description)

        mapping = cls.load_mapping()
        category_name = "Others"
        search_text = " ".join(part for part in [description, purpose, raw_text] if part)
        for cat, pattern in mapping.items():
            match = re.search(f"({pattern})", search_text, re.IGNORECASE)
            if match:
                category_name = cat
                if not merchant_name:
                    merchant_name = match.group(1).strip().title()
                break

        hash_input = f"{tx['iban']}|{date_clean}|{amount:.2f}|{currency}|{raw_text}"
        import_hash = hashlib.md5(hash_input.encode()).hexdigest()

        return {
            "iban": tx["iban"],
            "booked_at": date_clean,
            "amount": amount,
            "currency": currency,
            "description": description,
            "purpose": purpose,
            "merchant": merchant_name,
            "category_name": category_name,
            "raw_text": raw_text,
            "import_hash": import_hash,
        }

    @staticmethod
    def _parse_amount(amount_str) -> float:
        if amount_str is None:
            return 0.0

        cleaned = str(amount_str).replace("'", "").replace(" ", "").strip()
        if not cleaned:
            return 0.0

        if "," in cleaned and "." not in cleaned:
            cleaned = cleaned.replace(",", ".")
        elif "," in cleaned and "." in cleaned:
            if cleaned.rindex(",") > cleaned.rindex("."):
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")

        try:
            value = Decimal(cleaned).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            return float(value)
        except InvalidOperation as exc:
            raise ValueError(f"Cannot parse amount: '{amount_str}'") from exc

    @staticmethod
    def _normalize_whitespace(value: str) -> str:
        return " ".join(value.split()).strip()

    @staticmethod
    def _extract_currency(text: str) -> str:
        # Supports values like "CHF 29.95" in multiline purpose rows.
        match = re.search(r"\b([A-Z]{3})\s*[0-9'.,]+", text.upper())
        return match.group(1) if match else "CHF"

    @classmethod
    def _extract_merchant(cls, description: str):
        cleaned = description
        cleaned = re.sub(r"^(Acquisto|Accredito|Pagamento)\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^TWINT\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bTWINT\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*,\s*N\.\s*carta.*$", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+\d{2}\.\d{2}\.\d{4}.*$", "", cleaned)
        cleaned = re.sub(r"\s*CHF\s*[0-9'.,]+.*$", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*-\s*MOB APP$", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip(" ,;-")
        cleaned = cls._normalize_whitespace(cleaned)
        return cleaned or None

    @staticmethod
    def _infer_purpose(description: str):
        description_upper = (description or "").upper()
        if "ACCREDITO TWINT" in description_upper:
            return "Incoming TWINT transfer"
        if "PAGAMENTO TWINT" in description_upper:
            return "Outgoing TWINT transfer"
        if "ACQUISTO TWINT" in description_upper:
            return "TWINT purchase"
        if description_upper.startswith("RIPORTO DA"):
            return "Internal transfer in"
        if description_upper.startswith("RIPORTO SU"):
            return "Internal transfer out"
        if description_upper.startswith("ORDINE PERMANENTE"):
            return "Standing order"
        if description_upper.startswith("LSV"):
            return "Direct debit"
        if description_upper.startswith("PAGAMENTO"):
            return "Payment"
        if description_upper.startswith("ACCREDITO"):
            return "Credit"
        return None
