#!/usr/bin/env python3
import requests
import json

url = "http://localhost:8000/api/auth/google/code"
data = {"code": "test_code", "redirect_uri": "http://localhost:5174/auth/callback"}

response = requests.post(url, json=data)
result = response.json()

# Extract the error message to see what client ID is being used
print("Response:", json.dumps(result, indent=2))

if "detail" in result:
    detail = result["detail"]
    if "invalid_client" in detail:
        print("\n⚠️ Google Client authentication failed!")
        print("This means either:")
        print("1. The GOOGLE_CLIENT_ID is incorrect")
        print("2. The GOOGLE_CLIENT_SECRET is incorrect")
        print("3. OR the redirect URI is not configured in Google Cloud Console")
