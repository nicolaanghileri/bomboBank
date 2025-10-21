from fastapi import APIRouter, UploadFile, File, HTTPException
import csv
from io import StringIO

router = APIRouter()


@router.post("/bank-csv")
async def upload_bank_csv(file: UploadFile = File(...)):
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files allowed.")

    try:
        content = await file.read()
        content_str = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=404, detail="Error decoding file to utf-8")
    
    lines = content_str.split('\n')
    try:
        csv_file = StringIO(content_str)
        reader = csv.DictReader(csv_file, delimiter=';')
        
        # In Liste konvertieren
        transactions = []
        for row in reader:
            transactions.append(row)
        
        # Erste 3 als Preview
        preview = transactions[:3]
        
        return {
            "success": True,
            "filename": file.filename,
            "total_transactions": len(transactions),
            "preview": preview,
            "columns": list(transactions[0].keys()) if transactions else []
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing failed: {str(e)}")