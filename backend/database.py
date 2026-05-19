import os
import httpx
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")

# Headers needed for all Supabase REST requests
HEADERS = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

class SupabaseClient:
    def __init__(self, base_url, headers):
        # Ensure url ends with /rest/v1
        if not base_url.endswith("/rest/v1"):
            base_url = f"{base_url.rstrip('/')}/rest/v1"
        self.base_url = base_url
        self.headers = headers

    def table(self, table_name: str):
        return TableClient(f"{self.base_url}/{table_name}", self.headers)

class TableClient:
    def __init__(self, url, headers):
        self.url = url
        self.headers = headers

    def insert(self, data: dict):
        with httpx.Client() as client:
            response = client.post(self.url, json=data, headers=self.headers)
            response.raise_for_status()
            return response.json()

    def select(self, query: str = "*", filters: dict = None):
        # Basic select. For ordering, we add params.
        with httpx.Client() as client:
            # We sort by timestamp descending by default for history
            params = {"select": query, "order": "timestamp.desc"}
            if filters:
                for key, val in filters.items():
                    params[key] = f"eq.{val}"
            
            response = client.get(self.url, params=params, headers=self.headers)
            response.raise_for_status()
            return response.json()

# Simple client instance
if not url or not key:
    print("Warning: SUPABASE_URL or SUPABASE_KEY not found in environment variables.")

supabase = SupabaseClient(url, HEADERS)
