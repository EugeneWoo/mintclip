#!/usr/bin/env python3
"""
Test Google OAuth flow
"""
import requests
import json

# Test the auth code endpoint
url = "http://localhost:8000/api/auth/google/code"

test_data = {
    "code": "test_code",
    "redirect_uri": "http://localhost:5174/auth/callback"
}

print("Testing Google OAuth code exchange endpoint...")
print(f"URL: {url}")
print(f"Data: {test_data}")
print()

response = requests.post(url, json=test_data)

print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2) if response.content else 'No content'}")
