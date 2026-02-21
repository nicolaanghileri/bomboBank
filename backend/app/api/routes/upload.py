import os
import jwt
from jwt import InvalidTokenError
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from app.services.supabase import get_supabase_client
from transaction_parser import TransactionParser

router = APIRouter()

def _extract_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header. Use: Bearer <token>")
    token = authorization[len("Bearer "):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return token

def _extract_user_id_from_token(token: str) -> str:
    # Extract `sub` claim only; Supabase authorization is enforced separately
    # when requests are executed with `client.postgrest.auth(access_token)`.
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False, "verify_aud": False},
            algorithms=["HS256", "RS256", "ES256"],
        )
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token format")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token does not contain user id")
    return user_id

@router.post("/bank-csv")
async def upload_bank_csv(
    file: UploadFile = File(...),
    authorization: str = Header(...)  # ← Bearer Token kommt hier rein
):
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files allowed.")

    token = _extract_token(authorization)

    try:
        content = await file.read()
        try:
            content_str = content.decode('utf-8')
        except UnicodeDecodeError:
            content_str = content.decode('latin1')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Error decoding file")
    
    try:
        # Extract user_id (JWT sub) locally to avoid extra network call.
        user_id = _extract_user_id_from_token(token)
        
        # Get user's client (with RLS)
        supabase = get_supabase_client(token)
        
        # Load categories for mapping
        categories_response = supabase.table('categories').select('*').execute()
        categories_map = {cat['name']: cat['id'] for cat in categories_response.data}
        
        # Use the same parser workflow that works in manual tests
        parsed_from_csv = TransactionParser.parse_csv(content_str)
        parsed_transactions = []
        skipped = 0
        errors = []
        
        # Process parsed transactions
        for row_num, parsed in enumerate(parsed_from_csv, start=2):
            try:
                # Add user_id from token
                parsed['user_id'] = user_id
                
                # Map category name to ID
                category_name = parsed.pop('category_name', None)
                parsed['category_id'] = (
                    categories_map.get(category_name)
                    or categories_map.get("Other")
                    or categories_map.get("Others")
                )
                
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
                batch_start_row = i + 2
                
                try:
                    insert_response = (
                        supabase.table('transactions')
                        .insert(batch)
                        .execute()
                    )
                    inserted += len(insert_response.data)
                    
                except Exception as e:
                    # Continue import: retry this batch row-by-row and skip failing rows.
                    errors.append(
                        f"Batch starting at parsed row {batch_start_row} failed, retrying row-by-row: {str(e)}"
                    )
                    for offset, row in enumerate(batch):
                        row_num = batch_start_row + offset
                        try:
                            single_insert = (
                                supabase.table('transactions')
                                .insert(row)
                                .execute()
                            )
                            if single_insert.data:
                                inserted += 1
                        except Exception as row_error:
                            errors.append(f"Row {row_num}: insert failed: {str(row_error)}")
                            continue
        
        return {
            "success": True,
            "message": f"Successfully imported {inserted} transactions",
            "summary": {
                "total_in_file": len(parsed_from_csv),
                "inserted": inserted,
                "duplicates_skipped": skipped,
                "errors": errors if errors else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
