#!/usr/bin/env python3
"""
Automated API Testing Script for Mintclip Authentication Endpoints
Tests all auth flows programmatically before manual UI testing
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Optional, Tuple

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = f"test_{int(time.time())}@example.com"
TEST_PASSWORD = "testpass123"

# ANSI color codes for pretty output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_num: int, test_name: str):
    """Print formatted test header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Test {test_num}: {test_name}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")

def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")

def print_info(message: str):
    """Print info message"""
    print(f"{Colors.YELLOW}→ {message}{Colors.RESET}")

def print_response(response: requests.Response):
    """Print response details"""
    print(f"\n{Colors.BOLD}Response:{Colors.RESET}")
    print(f"  Status: {response.status_code}")
    print(f"  Headers: {dict(response.headers)}")
    try:
        data = response.json()
        print(f"  Body: {json.dumps(data, indent=2)}")
    except:
        print(f"  Body: {response.text[:200]}")

class TestState:
    """Store test state across test cases"""
    def __init__(self):
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.email: Optional[str] = None
        self.test_results: list = []

    def record_result(self, test_name: str, passed: bool, message: str = ""):
        """Record test result"""
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })

state = TestState()

def test_1_health_check() -> bool:
    """Test 1: Health Check - Verify backend is running"""
    print_test_header(1, "Health Check - Backend Server")

    try:
        print_info(f"Checking backend at {BASE_URL}/docs")
        response = requests.get(f"{BASE_URL}/docs", timeout=5)

        if response.status_code == 200:
            print_success(f"Backend is running on {BASE_URL}")
            state.record_result("Health Check", True)
            return True
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            state.record_result("Health Check", False, f"Status {response.status_code}")
            return False

    except requests.RequestException as e:
        print_error(f"Backend is not accessible: {e}")
        state.record_result("Health Check", False, str(e))
        return False

def test_2_signup_invalid_password() -> bool:
    """Test 2: Signup with password too short"""
    print_test_header(2, "Email Signup - Password Too Short")

    payload = {
        "email": TEST_EMAIL,
        "password": "short",  # Less than 8 characters
        "privacy_accepted": True,
        "terms_accepted": True
    }

    print_info(f"POST {BASE_URL}/api/auth/signup")
    print_info(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
        print_response(response)

        if response.status_code == 422:  # Validation error
            print_success("Validation error returned as expected")
            state.record_result("Signup - Invalid Password", True)
            return True
        else:
            print_error(f"Expected 422, got {response.status_code}")
            state.record_result("Signup - Invalid Password", False)
            return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Signup - Invalid Password", False, str(e))
        return False

def test_3_signup_missing_consent() -> bool:
    """Test 3: Signup without privacy/terms acceptance"""
    print_test_header(3, "Email Signup - Missing Consent")

    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "privacy_accepted": False,
        "terms_accepted": False
    }

    print_info(f"POST {BASE_URL}/api/auth/signup")
    print_info(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
        print_response(response)

        data = response.json()
        if response.status_code == 400 and "privacy policy" in data.get("detail", "").lower():
            print_success("Privacy policy validation working correctly")
            state.record_result("Signup - Missing Consent", True)
            return True
        else:
            print_error("Privacy policy validation not working")
            state.record_result("Signup - Missing Consent", False)
            return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Signup - Missing Consent", False, str(e))
        return False

def test_4_signup_success() -> bool:
    """Test 4: Successful email signup"""
    print_test_header(4, "Email Signup - Success")

    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "privacy_accepted": True,
        "terms_accepted": True
    }

    print_info(f"POST {BASE_URL}/api/auth/signup")
    print_info(f"Email: {TEST_EMAIL}")
    print_info(f"Password: {TEST_PASSWORD}")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
        print_response(response)

        if response.status_code == 200:
            data = response.json()

            # Check for email confirmation message
            if data.get("message") and "email" in data.get("message", "").lower():
                print_success("Email confirmation required (expected for some Supabase configs)")
                state.record_result("Signup - Success", True, "Email confirmation required")
                return True

            # Check for immediate login (auto-confirm enabled)
            if data.get("tokens") and data.get("user"):
                state.access_token = data["tokens"]["access_token"]
                state.refresh_token = data["tokens"]["refresh_token"]
                state.user_id = data["user"]["id"]
                state.email = data["user"]["email"]

                print_success(f"Signup successful! User created: {state.email}")
                print_success(f"Access token: {state.access_token[:20]}...")
                print_success(f"Refresh token: {state.refresh_token[:20]}...")
                state.record_result("Signup - Success", True)
                return True

        print_error(f"Signup failed with status {response.status_code}")
        state.record_result("Signup - Success", False, f"Status {response.status_code}")
        return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Signup - Success", False, str(e))
        return False

def test_5_signup_duplicate_email() -> bool:
    """Test 5: Signup with duplicate email"""
    print_test_header(5, "Email Signup - Duplicate Email")

    payload = {
        "email": TEST_EMAIL,  # Same email as test 4
        "password": TEST_PASSWORD,
        "privacy_accepted": True,
        "terms_accepted": True
    }

    print_info(f"POST {BASE_URL}/api/auth/signup")
    print_info(f"Attempting to register duplicate email: {TEST_EMAIL}")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
        print_response(response)

        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "").lower()
            if "already" in detail or "exists" in detail:
                print_success("Duplicate email detected correctly")
                state.record_result("Signup - Duplicate Email", True)
                return True

        print_error("Duplicate email not detected properly")
        state.record_result("Signup - Duplicate Email", False)
        return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Signup - Duplicate Email", False, str(e))
        return False

def test_6_login_invalid_credentials() -> bool:
    """Test 6: Login with invalid credentials"""
    print_test_header(6, "Email Login - Invalid Credentials")

    payload = {
        "email": TEST_EMAIL,
        "password": "wrongpassword123"
    }

    print_info(f"POST {BASE_URL}/api/auth/login")
    print_info(f"Using wrong password for: {TEST_EMAIL}")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        print_response(response)

        if response.status_code == 401:
            data = response.json()
            if "invalid" in data.get("detail", "").lower():
                print_success("Invalid credentials rejected correctly")
                state.record_result("Login - Invalid Credentials", True)
                return True

        print_error(f"Expected 401, got {response.status_code}")
        state.record_result("Login - Invalid Credentials", False)
        return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Login - Invalid Credentials", False, str(e))
        return False

def test_7_login_success() -> bool:
    """Test 7: Successful email login"""
    print_test_header(7, "Email Login - Success")

    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }

    print_info(f"POST {BASE_URL}/api/auth/login")
    print_info(f"Email: {TEST_EMAIL}")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        print_response(response)

        if response.status_code == 200:
            data = response.json()

            if data.get("tokens") and data.get("user"):
                state.access_token = data["tokens"]["access_token"]
                state.refresh_token = data["tokens"]["refresh_token"]
                state.user_id = data["user"]["id"]
                state.email = data["user"]["email"]

                print_success(f"Login successful!")
                print_success(f"User: {state.email}")
                print_success(f"User ID: {state.user_id}")
                print_success(f"Access token: {state.access_token[:30]}...")
                state.record_result("Login - Success", True)
                return True

        print_error(f"Login failed with status {response.status_code}")
        state.record_result("Login - Success", False)
        return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Login - Success", False, str(e))
        return False

def test_8_get_profile_authenticated() -> bool:
    """Test 8: Get user profile with valid token"""
    print_test_header(8, "Get Profile - Authenticated")

    if not state.access_token:
        print_error("No access token available. Skipping test.")
        state.record_result("Get Profile - Authenticated", False, "No token")
        return False

    headers = {
        "Authorization": f"Bearer {state.access_token}"
    }

    print_info(f"GET {BASE_URL}/api/auth/me")
    print_info(f"Authorization: Bearer {state.access_token[:30]}...")

    try:
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print_response(response)

        if response.status_code == 200:
            data = response.json()

            if data.get("email") == state.email:
                print_success(f"Profile retrieved successfully!")
                print_success(f"Email: {data['email']}")
                print_success(f"Tier: {data.get('tier')}")
                print_success(f"Summaries used: {data.get('summaries_used')}")
                state.record_result("Get Profile - Authenticated", True)
                return True

        print_error(f"Failed to get profile. Status: {response.status_code}")
        state.record_result("Get Profile - Authenticated", False)
        return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Get Profile - Authenticated", False, str(e))
        return False

def test_9_get_profile_unauthenticated() -> bool:
    """Test 9: Get user profile without token"""
    print_test_header(9, "Get Profile - Unauthenticated")

    print_info(f"GET {BASE_URL}/api/auth/me")
    print_info("No Authorization header")

    try:
        response = requests.get(f"{BASE_URL}/api/auth/me")
        print_response(response)

        if response.status_code == 401:
            print_success("Unauthenticated request rejected correctly")
            state.record_result("Get Profile - Unauthenticated", True)
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            state.record_result("Get Profile - Unauthenticated", False)
            return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Get Profile - Unauthenticated", False, str(e))
        return False

def test_10_get_profile_invalid_token() -> bool:
    """Test 10: Get user profile with invalid token"""
    print_test_header(10, "Get Profile - Invalid Token")

    headers = {
        "Authorization": "Bearer invalid_token_12345"
    }

    print_info(f"GET {BASE_URL}/api/auth/me")
    print_info("Authorization: Bearer invalid_token_12345")

    try:
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print_response(response)

        if response.status_code == 401:
            print_success("Invalid token rejected correctly")
            state.record_result("Get Profile - Invalid Token", True)
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            state.record_result("Get Profile - Invalid Token", False)
            return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Get Profile - Invalid Token", False, str(e))
        return False

def test_11_refresh_token() -> bool:
    """Test 11: Refresh access token"""
    print_test_header(11, "Refresh Token")

    if not state.refresh_token:
        print_error("No refresh token available. Skipping test.")
        state.record_result("Refresh Token", False, "No refresh token")
        return False

    payload = {
        "refresh_token": state.refresh_token
    }

    print_info(f"POST {BASE_URL}/api/auth/refresh")
    print_info(f"Refresh token: {state.refresh_token[:30]}...")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/refresh", json=payload)
        print_response(response)

        if response.status_code == 200:
            data = response.json()

            if data.get("access_token") and data.get("refresh_token"):
                old_access = state.access_token
                state.access_token = data["access_token"]
                state.refresh_token = data["refresh_token"]

                print_success(f"Token refreshed successfully!")
                print_success(f"New access token: {state.access_token[:30]}...")
                print_success(f"Tokens are different: {old_access != state.access_token}")
                state.record_result("Refresh Token", True)
                return True

        print_error(f"Token refresh failed. Status: {response.status_code}")
        state.record_result("Refresh Token", False)
        return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Refresh Token", False, str(e))
        return False

def test_12_logout() -> bool:
    """Test 12: Logout"""
    print_test_header(12, "Logout")

    if not state.access_token:
        print_error("No access token available. Skipping test.")
        state.record_result("Logout", False, "No token")
        return False

    headers = {
        "Authorization": f"Bearer {state.access_token}"
    }

    print_info(f"POST {BASE_URL}/api/auth/logout")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        print_response(response)

        if response.status_code == 200:
            print_success("Logout successful!")
            state.record_result("Logout", True)
            return True
        else:
            print_error(f"Logout failed. Status: {response.status_code}")
            state.record_result("Logout", False)
            return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Logout", False, str(e))
        return False

def test_13_google_token_invalid() -> bool:
    """Test 13: Google OAuth with invalid token"""
    print_test_header(13, "Google OAuth - Invalid Token")

    payload = {
        "google_token": "invalid_google_token_12345"
    }

    print_info(f"POST {BASE_URL}/api/auth/google/token")
    print_info("Using invalid Google token")

    try:
        response = requests.post(f"{BASE_URL}/api/auth/google/token", json=payload)
        print_response(response)

        if response.status_code == 401:
            data = response.json()
            if "invalid" in data.get("detail", "").lower() or "expired" in data.get("detail", "").lower():
                print_success("Invalid Google token rejected correctly")
                state.record_result("Google OAuth - Invalid Token", True)
                return True

        print_error(f"Expected 401, got {response.status_code}")
        state.record_result("Google OAuth - Invalid Token", False)
        return False

    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        state.record_result("Google OAuth - Invalid Token", False, str(e))
        return False

def print_summary():
    """Print test summary"""
    print(f"\n\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}TEST SUMMARY{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}\n")

    total = len(state.test_results)
    passed = sum(1 for r in state.test_results if r["passed"])
    failed = total - passed

    print(f"Total Tests: {total}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {failed}{Colors.RESET}")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")

    print(f"{Colors.BOLD}Detailed Results:{Colors.RESET}\n")
    for i, result in enumerate(state.test_results, 1):
        status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if result["passed"] else f"{Colors.RED}✗ FAIL{Colors.RESET}"
        print(f"{i:2d}. {status} - {result['test']}")
        if result["message"]:
            print(f"    {Colors.YELLOW}Note: {result['message']}{Colors.RESET}")

    # Save results to file
    results_file = "/Users/eugenewoo/mintclip/backend/manual_tests/auth_api_test_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "success_rate": f"{(passed/total*100):.1f}%"
            },
            "test_email": TEST_EMAIL,
            "results": state.test_results
        }, f, indent=2)

    print(f"\n{Colors.BOLD}Results saved to: {results_file}{Colors.RESET}")

def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}MINTCLIP AUTH API TEST SUITE{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"\nBackend URL: {BASE_URL}")
    print(f"Test Email: {TEST_EMAIL}")
    print(f"Test Password: {TEST_PASSWORD}")
    print(f"Timestamp: {datetime.now().isoformat()}\n")

    # Run all tests
    tests = [
        test_1_health_check,
        test_2_signup_invalid_password,
        test_3_signup_missing_consent,
        test_4_signup_success,
        test_5_signup_duplicate_email,
        test_6_login_invalid_credentials,
        test_7_login_success,
        test_8_get_profile_authenticated,
        test_9_get_profile_unauthenticated,
        test_10_get_profile_invalid_token,
        test_11_refresh_token,
        test_12_logout,
        test_13_google_token_invalid,
    ]

    for test_func in tests:
        try:
            test_func()
            time.sleep(0.5)  # Small delay between tests
        except Exception as e:
            print_error(f"Test crashed: {e}")
            state.record_result(test_func.__name__, False, f"Crashed: {e}")

    # Print summary
    print_summary()

if __name__ == "__main__":
    main()
