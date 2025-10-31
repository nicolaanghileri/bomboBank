from supabase import create_client, Client
from functools import lru_cache
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Admin client with service_role (bypasses RLS)
    Use for system operations only
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("Missing Supabase credentials in .env")
    
    return create_client(url, key)


def get_supabase_client(access_token: Optional[str] = None) -> Client:
    """
    Client for user operations (respects RLS)
    If access_token provided, sets user context
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("Missing Supabase credentials in .env")
    
    client = create_client(url, key)
    
    # If token provided, set auth context
    if access_token:
        client.postgrest.auth(access_token)
    
    return client