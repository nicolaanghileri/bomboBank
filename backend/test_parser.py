import json
import os
from transaction_parser import TransactionParser # Passe den Pfad an, falls noetig

# 1. Definiere den Dateinamen deiner CSV
dateiname = "test_data.csv"

print(f"🚀 Versuche Datei '{dateiname}' zu lesen...\n")

# 2. Prüfen, ob die Datei überhaupt existiert
if not os.path.exists(dateiname):
    print(f"❌ Fehler: Die Datei '{dateiname}' wurde nicht gefunden.")
    print("Bitte leg sie in denselben Ordner wie dieses Skript.")
else:
    try:
        # 3. Datei einlesen (utf-8 ist Standard, falls es bei Sonderzeichen hakt, probiere 'latin1')
        with open(dateiname, 'r', encoding='latin1') as file:
            csv_content_str = file.read()
            
        # 4. Den String an unseren Parser übergeben
        parsed_transactions = TransactionParser.parse_csv(csv_content_str)
        
        # 5. Ergebnis schön formatiert in der Konsole ausgeben
        print(json.dumps(parsed_transactions, indent=4, ensure_ascii=False))
        
        print(f"\n✅ {len(parsed_transactions)} Transaktionen erfolgreich geparst!")
        
    except Exception as e:
        print(f"❌ Es gab ein Problem beim Parsen: {e}")