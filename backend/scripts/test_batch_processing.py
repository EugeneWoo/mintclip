"""
Comprehensive Test Suite for Batch Video Processing API

Tests batch transcript extraction with 5-video limit enforcement
Run: python scripts/test_batch_processing.py

Prerequisites:
- Backend running on http://localhost:8000
- Valid Gemini API key in .env
"""

import requests
import time
import json
from typing import List, Dict

# Test configuration
BASE_URL = "http://localhost:8000/api/transcript"
MAX_BATCH_SIZE = 5

# Test video IDs (known working videos with captions)
VALID_VIDEO_IDS = [
    "dQw4w9WgXcQ",  # Rick Astley - Never Gonna Give You Up (English)
    "jNQXAC9IVRw",  # Me at the zoo (English)
    "9bZkp7q19f0",  # PSY - Gangnam Style (Korean)
    "kJQP7kiw5Fk",  # Luis Fonsi - Despacito (Spanish)
    "OPf0YbXqDm0",  # Mark Ronson - Uptown Funk (English)
]

# Invalid/problematic video IDs
INVALID_VIDEO_IDS = [
    "aaaaaaaaaaa",  # Invalid video ID
    "xxxxxxxxxxx",  # Non-existent video
]

# Private video (will fail)
PRIVATE_VIDEO_ID = "abc123def45"  # Placeholder for testing


class BatchProcessingTester:
    """Test suite for batch processing endpoints"""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.results = []

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"\n{status}: {test_name}")
        if details:
            print(f"  Details: {details}")
        self.results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })

    def test_health_check(self) -> bool:
        """Test if backend is running"""
        try:
            response = requests.get(f"{self.base_url.replace('/api/transcript', '')}/health", timeout=5)
            if response.status_code == 200:
                self.log_test("Backend Health Check", True, f"Status: {response.status_code}")
                return True
            else:
                self.log_test("Backend Health Check", False, f"Unexpected status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Backend Health Check", False, f"Connection failed: {e}")
            return False

    def test_batch_submission_valid(self) -> str | None:
        """Test batch submission with valid video IDs (within limit)"""
        test_name = f"Batch Submission (3/{MAX_BATCH_SIZE} videos)"

        try:
            payload = {
                "video_ids": VALID_VIDEO_IDS[:3],  # Use first 3 videos
                "languages": ["en"]
            }

            response = requests.post(f"{self.base_url}/batch", json=payload, timeout=10)

            if response.status_code == 200:
                data = response.json()
                job_id = data.get('job_id')

                if job_id and data.get('total_videos') == 3:
                    self.log_test(test_name, True, f"Job ID: {job_id}, Status: {data.get('status')}")
                    return job_id
                else:
                    self.log_test(test_name, False, f"Invalid response: {data}")
                    return None
            else:
                self.log_test(test_name, False, f"Status {response.status_code}: {response.text}")
                return None

        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return None

    def test_batch_limit_enforcement(self) -> bool:
        """Test that batches exceeding 5 videos are rejected"""
        test_name = f"Batch Limit Enforcement (6/{MAX_BATCH_SIZE} videos - should fail)"

        try:
            # Try to submit 6 videos (exceeds limit)
            payload = {
                "video_ids": VALID_VIDEO_IDS + ["extra_video"],  # 6 videos
                "languages": ["en"]
            }

            response = requests.post(f"{self.base_url}/batch", json=payload, timeout=10)

            # Should return 400 Bad Request
            if response.status_code == 400:
                error_msg = response.json().get('detail', '')
                if 'Maximum 5 videos' in error_msg or 'exceeds limit' in error_msg.lower():
                    self.log_test(test_name, True, f"Correctly rejected: {error_msg}")
                    return True
                else:
                    self.log_test(test_name, False, f"Wrong error message: {error_msg}")
                    return False
            else:
                self.log_test(test_name, False, f"Expected 400, got {response.status_code}")
                return False

        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False

    def test_batch_status_polling(self, job_id: str) -> bool:
        """Test polling batch job status until completion"""
        test_name = "Batch Status Polling"

        try:
            max_polls = 60  # Max 60 polls (120 seconds at 2s intervals)
            poll_interval = 2  # seconds

            for i in range(max_polls):
                response = requests.get(f"{self.base_url}/batch/{job_id}/status", timeout=10)

                if response.status_code != 200:
                    self.log_test(test_name, False, f"Status check failed: {response.status_code}")
                    return False

                data = response.json()
                status = data.get('status')
                completed = data.get('completed', 0)
                failed = data.get('failed', 0)
                total = data.get('total', 0)

                print(f"  Poll {i+1}: Status={status}, Progress={completed + failed}/{total}")

                # Check if job is complete
                if status in ['complete', 'failed']:
                    # Validate results
                    results = data.get('results', [])

                    if len(results) == total:
                        success_count = sum(1 for r in results if r['status'] == 'completed')
                        self.log_test(
                            test_name,
                            True,
                            f"Completed in {(i+1)*poll_interval}s: {success_count}/{total} successful"
                        )
                        return True
                    else:
                        self.log_test(test_name, False, f"Result count mismatch: {len(results)} != {total}")
                        return False

                time.sleep(poll_interval)

            self.log_test(test_name, False, f"Timeout after {max_polls * poll_interval}s")
            return False

        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False

    def test_batch_job_not_found(self) -> bool:
        """Test error handling for non-existent job ID"""
        test_name = "Batch Job Not Found"

        try:
            fake_job_id = "00000000-0000-0000-0000-000000000000"
            response = requests.get(f"{self.base_url}/batch/{fake_job_id}/status", timeout=10)

            if response.status_code == 404:
                error_msg = response.json().get('detail', '')
                if 'not found' in error_msg.lower() or 'expired' in error_msg.lower():
                    self.log_test(test_name, True, f"Correctly returned 404: {error_msg}")
                    return True
                else:
                    self.log_test(test_name, False, f"Wrong error message: {error_msg}")
                    return False
            else:
                self.log_test(test_name, False, f"Expected 404, got {response.status_code}")
                return False

        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False

    def test_empty_batch(self) -> bool:
        """Test error handling for empty video ID list"""
        test_name = "Empty Batch Submission"

        try:
            payload = {"video_ids": [], "languages": ["en"]}
            response = requests.post(f"{self.base_url}/batch", json=payload, timeout=10)

            if response.status_code == 400:
                error_msg = response.json().get('detail', '')
                if 'no video' in error_msg.lower():
                    self.log_test(test_name, True, f"Correctly rejected: {error_msg}")
                    return True
                else:
                    self.log_test(test_name, False, f"Wrong error message: {error_msg}")
                    return False
            else:
                self.log_test(test_name, False, f"Expected 400, got {response.status_code}")
                return False

        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False

    def test_exact_limit_batch(self) -> str | None:
        """Test batch with exactly 5 videos (at limit)"""
        test_name = f"Exact Limit Batch ({MAX_BATCH_SIZE}/{MAX_BATCH_SIZE} videos)"

        try:
            payload = {
                "video_ids": VALID_VIDEO_IDS[:5],  # Exactly 5 videos
                "languages": ["en"]
            }

            response = requests.post(f"{self.base_url}/batch", json=payload, timeout=10)

            if response.status_code == 200:
                data = response.json()
                job_id = data.get('job_id')

                if job_id and data.get('total_videos') == 5:
                    self.log_test(test_name, True, f"Job ID: {job_id}")
                    return job_id
                else:
                    self.log_test(test_name, False, f"Invalid response: {data}")
                    return None
            else:
                self.log_test(test_name, False, f"Status {response.status_code}: {response.text}")
                return None

        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return None

    def test_url_parser(self) -> bool:
        """Test URL parser utility with various formats"""
        test_name = "URL Parser Utility"

        try:
            import sys
            import os
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from app.utils.url_parser import parse_youtube_urls, extract_video_id, is_valid_video_id

            # Test direct video ID
            assert is_valid_video_id("dQw4w9WgXcQ") == True
            assert is_valid_video_id("invalid") == False
            assert is_valid_video_id("too-long-id-123") == False

            # Test URL extraction
            assert extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
            assert extract_video_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
            assert extract_video_id("https://www.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
            assert extract_video_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"
            assert extract_video_id("invalid_url") == None

            # Test batch parsing
            urls = """https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/jNQXAC9IVRw
dQw4w9WgXcQ"""  # Note: dQw4w9WgXcQ is duplicate, should be filtered

            video_ids = parse_youtube_urls(urls)
            assert len(video_ids) == 2  # Duplicates removed
            assert "dQw4w9WgXcQ" in video_ids
            assert "jNQXAC9IVRw" in video_ids

            self.log_test(test_name, True, "All URL parsing tests passed")
            return True

        except AssertionError as e:
            self.log_test(test_name, False, f"Assertion failed: {e}")
            return False
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("=" * 60)
        print("BATCH PROCESSING API TEST SUITE")
        print("=" * 60)

        # Test 1: Health check
        if not self.test_health_check():
            print("\n❌ Backend not running. Aborting tests.")
            return

        # Test 2: URL parser utility
        self.test_url_parser()

        # Test 3: Empty batch
        self.test_empty_batch()

        # Test 4: Batch limit enforcement (6 videos - should fail)
        self.test_batch_limit_enforcement()

        # Test 5: Valid batch (3 videos)
        job_id = self.test_batch_submission_valid()
        if job_id:
            # Test 6: Status polling
            self.test_batch_status_polling(job_id)

        # Test 7: Job not found
        self.test_batch_job_not_found()

        # Test 8: Exact limit batch (5 videos)
        job_id_5 = self.test_exact_limit_batch()
        if job_id_5:
            # Poll until complete (quick check)
            print(f"\n  Polling job {job_id_5} for completion...")
            time.sleep(5)  # Give it a few seconds
            response = requests.get(f"{self.base_url}/batch/{job_id_5}/status")
            if response.status_code == 200:
                data = response.json()
                print(f"  Final status: {data.get('status')}, Progress: {data.get('completed')}/{data.get('total')}")

        # Print summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        passed = sum(1 for r in self.results if r['passed'])
        failed = sum(1 for r in self.results if not r['passed'])
        total = len(self.results)

        print(f"\nTotal Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")

        if failed > 0:
            print("\nFailed Tests:")
            for r in self.results:
                if not r['passed']:
                    print(f"  - {r['test']}: {r['details']}")

        print("\n" + "=" * 60)

        # Save results to JSON
        import os
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'manual_tests')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, 'batch_processing_test_results.json')

        with open(output_path, 'w') as f:
            json.dump({
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'total_tests': total,
                'passed': passed,
                'failed': failed,
                'results': self.results
            }, f, indent=2)

        print(f"\n📄 Results saved to: {output_path}")


def main():
    """Main test runner"""
    tester = BatchProcessingTester(BASE_URL)
    tester.run_all_tests()


if __name__ == "__main__":
    main()
