import os
import jwt
from jwt import InvalidTokenError
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
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
    bank_type: str = Form("migros_bank"),  # migros_bank | raiffeisen | ubs
    authorization: str = Header(...)
):
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files allowed.")

    valid_bank_types = {"migros_bank", "raiffeisen", "ubs"}
    if bank_type not in valid_bank_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown bank_type '{bank_type}'. Must be one of: {', '.join(sorted(valid_bank_types))}"
        )

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
        categories_map = {
            cat['name'].strip().lower(): cat['id']
            for cat in categories_response.data
            if cat.get('name') and cat.get('id')
        }
        fallback_category_id = (
            categories_map.get("other")
            or categories_map.get("others")
        )
        
        # Use the same parser workflow that works in manual tests
        parsed_from_csv = TransactionParser.parse_csv(content_str, bank_type=bank_type)
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
                category_key = category_name.strip().lower() if isinstance(category_name, str) else None
                parsed['category_id'] = categories_map.get(category_key) if category_key else fallback_category_id

                # Keep only columns that exist in the `transactions` table.
                allowed_columns = {
                    'user_id',
                    'category_id',
                    'amount',
                    'currency',
                    'booked_at',
                    'description',
                    'purpose',
                    'iban',
                    'import_hash',
                    'merchant',
                    'raw_text',
                }
                parsed = {k: v for k, v in parsed.items() if k in allowed_columns}
                
                required_fields = ('amount', 'booked_at', 'import_hash')
                for field in required_fields:
                    if parsed.get(field) in (None, ''):
                        raise ValueError(f"Missing required field '{field}'")
                
                # Check for duplicates
                existing_query = (
                    supabase.table('transactions')
                    .select('id')
                    .eq('user_id', user_id)
                    .eq('import_hash', parsed['import_hash'])
                    .limit(1)
                )
                existing_response = existing_query.execute()
                
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
            "bank_type": bank_type,
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
