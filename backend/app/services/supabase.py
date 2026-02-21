from supabase import create_client, Client
from functools import lru_cache
import os
from dotenv import load_dotenv
from typing import Optional
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")


def _first_env(*keys: str) -> Optional[str]:
    for key in keys:
        value = os.getenv(key)
        if value:
            return value
    return None


def _get_project_url() -> Optional[str]:
    return _first_env("SUPABASE_URL", "VITE_SUPABASE_URL")


def _get_public_client_key() -> Optional[str]:
    return _first_env(
        "SUPABASE_ANON_KEY",
        "SUPABASE_KEY",
        "VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
        "VITE_SUPABASE_ANON_KEY",
    )

@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Admin client with service_role (bypasses RLS)
    Use for system operations only
    """
    url = _get_project_url()
    key = _first_env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY") or _get_public_client_key()
    
    if not url or not key:
        raise ValueError("Missing Supabase admin credentials in .env")
    
    return create_client(url, key)


def get_supabase_client(access_token: Optional[str] = None) -> Client:
    """
    Client for user operations (respects RLS)
    If access_token provided, sets user context
    """
    url = _get_project_url()
    key = _get_public_client_key()
    
    if not url or not key:
        raise ValueError(
            "Missing Supabase credentials. Set SUPABASE_URL and one of: "
            "SUPABASE_ANON_KEY, SUPABASE_KEY, or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
        )
    
    client = create_client(url, key)
    
    # If token provided, set auth context
    if access_token:
        client.postgrest.auth(access_token)
    
    return client
