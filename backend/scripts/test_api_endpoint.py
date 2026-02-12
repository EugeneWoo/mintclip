"""
Test the /api/saved-items/list endpoint directly
"""
import requests
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Test with a mock user token
# In production, you'd need a real JWT token
def test_endpoint():
    url = "http://localhost:8000/api/saved-items/list"

    print("Testing API endpoint:", url)
    print("-" * 50)

    # Try without auth first
    print("\n1. Testing without auth (should fail):")
    response = requests.get(url)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}")

    # Test with a fake token (should also fail but differently)
    print("\n2. Testing with invalid token:")
    headers = {"Authorization": "Bearer fake-token"}
    response = requests.get(url, headers=headers)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}")

    print("\n" + "=" * 50)
    print("Note: For successful test, you need a valid JWT token")
    print("Get one from the extension or create via /api/auth/google/token")

if __name__ == '__main__':
    test_endpoint()
