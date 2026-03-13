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

    # ─────────────────────────────────────────────────────────────────────────
    # Public entry point
    # ─────────────────────────────────────────────────────────────────────────

    @classmethod
    def parse_csv(cls, csv_content_str: str, bank_type: str = "raiffeisen"):
        """Dispatch to the right bank parser based on bank_type."""
        bank_type = (bank_type or "raiffeisen").lower().strip()

        if bank_type == "migros_bank":
            return cls._parse_migros_bank(csv_content_str)
        elif bank_type == "ubs":
            return cls._parse_ubs(csv_content_str)
        else:  # raiffeisen (default)
            return cls._parse_raiffeisen(csv_content_str)

    # ─────────────────────────────────────────────────────────────────────────
    # Raiffeisen parser  (existing logic, unchanged)
    # ─────────────────────────────────────────────────────────────────────────
    # Format: semicolon-delimited, multi-row per transaction.
    # Header row: IBAN | Booked At | Text | Credit/Debit Amount | Balance | Valuta Date
    # Continuation rows have empty IBAN — their Text is appended as purpose.

    @classmethod
    def _parse_raiffeisen(cls, csv_content_str: str):
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

    # ─────────────────────────────────────────────────────────────────────────
    # Migros Bank parser
    # ─────────────────────────────────────────────────────────────────────────
    # Format: semicolon-delimited, one row per transaction.
    # The file starts with several header/metadata lines before the column row.
    #
    # Typical export layout:
    #   Konto;CH12 3456 ...
    #   Kontoinhaber;Max Muster
    #   (blank)
    #   Datum;Buchungstext;Betrag;Währung;Wertstellung;Saldo
    #   01.03.2025;Kartenzahlung Coop;-50.00;CHF;01.03.2025;4950.00
    #
    # Amount sign: negative = debit, positive = credit.
    # Date format: DD.MM.YYYY

    @classmethod
    def _parse_migros_bank(cls, csv_content_str: str):
        lines = csv_content_str.splitlines()

        # ── Extract IBAN from metadata header if present ──────────────────
        iban = ""
        for line in lines[:10]:
            m = re.search(r"(CH\d{2}[\d\s]{16,})", line)
            if m:
                iban = re.sub(r"\s+", "", m.group(1))
                break

        # ── Find the data header row ──────────────────────────────────────
        # Look for a line that contains "Datum" or "Buchungsdatum" (case-insensitive)
        header_idx = None
        for i, line in enumerate(lines):
            parts = [p.strip().lower() for p in line.split(";")]
            if any(p in ("datum", "buchungsdatum", "buchungs datum") for p in parts):
                header_idx = i
                break

        if header_idx is None:
            raise ValueError("Migros Bank CSV: could not find header row with 'Datum'")

        # Re-parse from header line onward
        data_block = "\n".join(lines[header_idx:])
        f = StringIO(data_block.strip())
        reader = csv.DictReader(f, delimiter=";")

        # Normalise header keys (strip whitespace, lowercase)
        def _key(d, *candidates):
            for k in d.keys():
                kl = k.strip().lower()
                for c in candidates:
                    if c in kl:
                        return k
            return None

        transactions = []
        for row in reader:
            date_key = _key(row, "datum", "buchungsdatum")
            text_key = _key(row, "buchungstext", "text", "beschreibung", "verwendungszweck")
            amount_key = _key(row, "betrag", "amount")
            currency_key = _key(row, "währung", "waehrung", "currency")

            if not date_key or not amount_key:
                continue  # skip metadata/blank rows

            raw_date = (row.get(date_key) or "").strip()
            date_iso = cls._parse_date(raw_date)
            if not date_iso:
                continue  # skip non-data rows

            amount = cls._parse_amount(row.get(amount_key))
            description = cls._normalize_whitespace((row.get(text_key) or "") if text_key else "")
            currency = (row.get(currency_key) or "CHF").strip() if currency_key else "CHF"
            if not currency:
                currency = cls._extract_currency(description) or "CHF"

            raw_text = description
            hash_input = f"{iban}|{date_iso}|{amount:.2f}|{currency}|{raw_text}"
            import_hash = hashlib.md5(hash_input.encode()).hexdigest()

            transactions.append({
                "iban": iban,
                "booked_at": date_iso,
                "description": description,
                "purpose_parts": [],
                "raw_text_parts": [raw_text],
                "amount": amount,
                "_currency_override": currency,
                "_import_hash_override": import_hash,
            })

        return [cls._clean_transaction(tx) for tx in transactions]

    # ─────────────────────────────────────────────────────────────────────────
    # UBS parser
    # ─────────────────────────────────────────────────────────────────────────
    # UBS exports a semicolon-delimited CSV (may have quoted fields).
    # The file usually starts with a few account-info lines before the header.
    #
    # Typical export layouts (UBS has several):
    #
    #   Layout A (private account):
    #     Buchungsdatum;Wertschriftendatum;Beschreibung1;Beschreibung2;Beschreibung3;Betrag CHF;Saldo CHF
    #     01.03.2025;01.03.2025;Debit card;COOP SUPERMARKT;Zürich;-50.00;4950.00
    #
    #   Layout B (simplified):
    #     Datum;Buchungstext;Belastung;Gutschrift;Saldo
    #     01.03.2025;Kartenzahlung COOP;50.00;;4950.00
    #
    # Amount: signed in layout A; split Belastung/Gutschrift in layout B.
    # Date format: DD.MM.YYYY or YYYY-MM-DD.

    @classmethod
    def _parse_ubs(cls, csv_content_str: str):
        lines = csv_content_str.splitlines()

        # ── Extract IBAN from metadata header if present ──────────────────
        iban = ""
        for line in lines[:15]:
            m = re.search(r"(CH\d{2}[\d\s]{16,})", line)
            if m:
                iban = re.sub(r"\s+", "", m.group(1))
                break

        # ── Find the data header row ──────────────────────────────────────
        header_idx = None
        for i, line in enumerate(lines):
            # Strip quotes for detection
            clean = line.replace('"', '')
            parts = [p.strip().lower() for p in clean.split(";")]
            if any(p in ("buchungsdatum", "datum", "date") for p in parts):
                header_idx = i
                break

        if header_idx is None:
            raise ValueError("UBS CSV: could not find header row with 'Buchungsdatum' or 'Datum'")

        data_block = "\n".join(lines[header_idx:])
        f = StringIO(data_block.strip())
        reader = csv.DictReader(f, delimiter=";", quotechar='"')

        def _key(d, *candidates):
            for k in d.keys():
                kl = k.strip().lower().replace('"', '')
                for c in candidates:
                    if c in kl:
                        return k
            return None

        transactions = []
        for row in reader:
            date_key = _key(row, "buchungsdatum", "datum", "date")
            desc1_key = _key(row, "beschreibung1", "buchungstext", "text", "description")
            desc2_key = _key(row, "beschreibung2")
            desc3_key = _key(row, "beschreibung3")
            amount_key = _key(row, "betrag")          # signed amount (layout A)
            debit_key = _key(row, "belastung")        # debit-only column (layout B)
            credit_key = _key(row, "gutschrift")      # credit-only column (layout B)
            currency_key = _key(row, "währung", "waehrung", "currency")

            if not date_key:
                continue

            raw_date = (row.get(date_key) or "").strip().replace('"', '')
            date_iso = cls._parse_date(raw_date)
            if not date_iso:
                continue

            # Build description from available text columns
            parts = []
            for k in [desc1_key, desc2_key, desc3_key]:
                if k:
                    v = (row.get(k) or "").strip().replace('"', '')
                    if v:
                        parts.append(v)
            description = cls._normalize_whitespace(" | ".join(parts)) if parts else ""

            # Resolve amount
            amount = 0.0
            if amount_key and (row.get(amount_key) or "").strip().replace('"', ''):
                amount = cls._parse_amount(row.get(amount_key))
            elif debit_key or credit_key:
                debit_str = (row.get(debit_key) or "").strip().replace('"', '') if debit_key else ""
                credit_str = (row.get(credit_key) or "").strip().replace('"', '') if credit_key else ""
                if debit_str:
                    amount = -abs(cls._parse_amount(debit_str))
                elif credit_str:
                    amount = abs(cls._parse_amount(credit_str))

            currency = "CHF"
            if currency_key:
                c = (row.get(currency_key) or "").strip().replace('"', '')
                if c:
                    currency = c
            if currency == "CHF" and description:
                currency = cls._extract_currency(description) or "CHF"

            # Try to extract CHF from amount column header (e.g. "Betrag CHF")
            if amount_key:
                m = re.search(r"\b([A-Z]{3})\b", amount_key)
                if m:
                    currency = m.group(1)

            raw_text = description
            hash_input = f"{iban}|{date_iso}|{amount:.2f}|{currency}|{raw_text}"
            import_hash = hashlib.md5(hash_input.encode()).hexdigest()

            transactions.append({
                "iban": iban,
                "booked_at": date_iso,
                "description": description,
                "purpose_parts": [],
                "raw_text_parts": [raw_text],
                "amount": amount,
                "_currency_override": currency,
                "_import_hash_override": import_hash,
            })

        return [cls._clean_transaction(tx) for tx in transactions]

    # ─────────────────────────────────────────────────────────────────────────
    # Shared helpers
    # ─────────────────────────────────────────────────────────────────────────

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
    def _clean_transaction(cls, tx):
        raw_text = cls._normalize_whitespace(" | ".join(tx["raw_text_parts"]))
        description = tx.get("description") or raw_text
        purpose = cls._normalize_whitespace(" | ".join(tx.get("purpose_parts", []))) or None
        if not purpose:
            purpose = cls._infer_purpose(description)

        amount = tx["amount"]
        date_clean = (tx.get("booked_at") or "").split(" ")[0]

        # Allow parsers to override currency / import_hash
        currency = tx.get("_currency_override") or cls._extract_currency(raw_text)
        import_hash = tx.get("_import_hash_override")

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

        if not import_hash:
            iban = tx.get("iban", "")
            hash_input = f"{iban}|{date_clean}|{amount:.2f}|{currency}|{raw_text}"
            import_hash = hashlib.md5(hash_input.encode()).hexdigest()

        return {
            "iban": tx.get("iban", ""),
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
        cleaned = str(amount_str).replace("'", "").replace(" ", "").replace('"', '').strip()
        # Handle special minus signs (e.g. Unicode minus −)
        cleaned = cleaned.replace("\u2212", "-")
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
    def _parse_date(date_str: str) -> str | None:
        """Convert DD.MM.YYYY or YYYY-MM-DD to YYYY-MM-DD. Returns None if unparseable."""
        s = date_str.strip().replace('"', '')
        if not s:
            return None
        # Already ISO
        if re.match(r"^\d{4}-\d{2}-\d{2}", s):
            return s[:10]
        # DD.MM.YYYY
        m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})", s)
        if m:
            return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
        # DD/MM/YYYY
        m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
        if m:
            return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
        return None

    @staticmethod
    def _normalize_whitespace(value: str) -> str:
        return " ".join(value.split()).strip()

    @staticmethod
    def _extract_currency(text: str) -> str:
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
        # Remove pipe separators from multi-part UBS descriptions — take first segment
        if " | " in cleaned:
            cleaned = cleaned.split(" | ")[0]
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
