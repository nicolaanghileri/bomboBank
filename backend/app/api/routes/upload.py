from fastapi import APIRouter, UploadFile, File, HTTPException, Header
import csv
from io import StringIO
from app.services.supabase import get_supabase_client, get_supabase_admin_client
from app.services.transaction_parser import TransactionParser

router = APIRouter()

@router.post("/bank-csv")
async def upload_bank_csv(
    file: UploadFile = File(...),
    authorization: str = Header(...)  # ← Bearer Token kommt hier rein
):
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files allowed.")

    # Extract token from "Bearer <token>"
    try:
        token = authorization.split("Bearer ")[1]
    except:
        raise HTTPException(status_code=401, detail="Invalid authorization header. Use: Bearer <token>")

    try:
        content = await file.read()
        content_str = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Error decoding file to utf-8")
    
    try:
        # Get user_id from token
        supabase_admin = get_supabase_admin_client()
        user_response = supabase_admin.auth.get_user(token)
        user_id = user_response.user.id  # ← HIER kommt die user_id her!
        
        # Get user's client (with RLS)
        supabase = get_supabase_client(token)
        
        csv_file = StringIO(content_str)
        reader = csv.DictReader(csv_file, delimiter=';')
        
        # Load categories for mapping
        categories_response = supabase.table('categories').select('*').execute()
        categories_map = {cat['name']: cat['id'] for cat in categories_response.data}
        
        parsed_transactions = []
        skipped = 0
        errors = []
        
        # Parse each row
        for row_num, row in enumerate(reader, start=2):
            try:
                # Parse transaction
                parsed = TransactionParser.parse_transaction(row)
                
                # Add user_id (NOW IT'S DEFINED!)
                parsed['user_id'] = user_id
                
                # Map category name to ID
                category_name = parsed.pop('category_name')
                parsed['category_id'] = categories_map.get(category_name)
                
                # Check for duplicates
                existing_response = (
                    supabase.table('transactions')
                    .select('id')
                    .eq('iban', parsed['iban'])
                    .eq('booked_at', parsed['booked_at'])
                    .eq('amount', parsed['amount'])
                    .execute()
                )
                
                if existing_response.data:
                    skipped += 1
                    continue
                
                parsed_transactions.append(parsed)
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                continue
        
        # Batch insert into Supabase
        inserted = 0
        if parsed_transactions:
            batch_size = 100
            
            for i in range(0, len(parsed_transactions), batch_size):
                batch = parsed_transactions[i:i + batch_size]
                
                try:
                    insert_response = (
                        supabase.table('transactions')
                        .insert(batch)
                        .execute()
                    )
                    inserted += len(insert_response.data)
                    
                except Exception as e:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Database insert failed: {str(e)}"
                    )
        
        return {
            "success": True,
            "message": f"Successfully imported {inserted} transactions",
            "summary": {
                "total_in_file": len(parsed_transactions) + skipped,
                "inserted": inserted,
                "duplicates_skipped": skipped,
                "errors": errors if errors else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")