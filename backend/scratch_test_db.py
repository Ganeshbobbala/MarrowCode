import os
import httpx
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL", "")
key = os.getenv("SUPABASE_KEY", "")

print(f"URL: {url}")
print(f"Key: {key[:10]}...")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
}

if not url.endswith("/rest/v1"):
    url = f"{url.rstrip('/')}/rest/v1"

try:
    with httpx.Client() as client:
        response = client.get(f"{url}/reviews?select=count", headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
