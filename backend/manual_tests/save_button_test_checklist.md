# Save Button Manual Test Checklist

## Test Date: 2026-02-06
## Feature: Save buttons for Transcript, Summary, and Chat tabs

---

## Setup
- [ ] Extension loaded in Chrome
- [ ] Logged in to extension (authenticated)
- [ ] Backend server running on port 8000
- [ ] Navigate to any YouTube video

---

## Test 1: Transcript Tab Save Button

### Test 1.1: Button Visibility
- [ ] Open Transcript tab
- [ ] Click "Get Transcript" if not already loaded
- [ ] Verify "Save" button appears next to Copy button in controls area
- [ ] Button should show text "Save" (not icon)

### Test 1.2: Save Functionality
- [ ] Click "Save" button
- [ ] Verify button shows "✓ Saved" with green background
- [ ] Verify feedback disappears after 2 seconds
- [ ] Check browser console for success message: `[YouTubeSidebar] Transcript saved successfully`
- [ ] No error toasts should appear

### Test 1.3: Save Button States
- [ ] Before clicking: Button has gray background with white text
- [ ] After clicking: Button shows green background with "✓ Saved"
- [ ] After 2 seconds: Button returns to "Save" state
- [ ] Clicking again should work (upsert behavior)

### Test 1.4: Edge Cases
- [ ] Try saving transcript with different language selected
- [ ] Switch languages and save again (should update, not create duplicate)
- [ ] Verify save works with search filter active

**Expected Result:** Transcript saves to Supabase `saved_items` table with:
- `item_type`: "transcript"
- `content.language`: current language code
- `content.segments`: full transcript segments
- `content.text`: plain text concatenated

---

## Test 2: Summary Tab Save Button

### Test 2.1: Button Visibility
- [ ] Open Summary tab
- [ ] Generate a summary (any format: Short/Topics/Q&A)
- [ ] Verify "Save" button appears between Copy and Export buttons
- [ ] Button should show text "Save"

### Test 2.2: Save Functionality - Short Format
- [ ] Select "Short" format
- [ ] Generate summary
- [ ] Click "Save" button
- [ ] Verify "✓ Saved" feedback appears
- [ ] Check console for success message
- [ ] No error toasts

### Test 2.3: Save Functionality - Topics Format
- [ ] Select "Topics" format
- [ ] Generate summary (or switch if already generated)
- [ ] Click "Save" button
- [ ] Verify save feedback
- [ ] Check console for success message

### Test 2.4: Save Functionality - Q&A Format
- [ ] Select "Q&A" format
- [ ] Generate summary
- [ ] Click "Save" button
- [ ] Verify save feedback
- [ ] Check console for success message

### Test 2.5: Save Button States
- [ ] Before save: Gray background
- [ ] After save: Green background with "✓ Saved"
- [ ] After 2 seconds: Returns to "Save"
- [ ] Switching formats and saving again should work

**Expected Result:** Summary saves to Supabase with:
- `item_type`: "summary"
- `content.format`: "short" | "topic" | "qa"
- `content.summary`: full summary text with markdown
- `content.is_structured`: boolean flag

---

## Test 3: Chat Tab Save Button

### Test 3.1: Button Visibility
- [ ] Open Chat tab
- [ ] When no messages exist: Save button should NOT be visible
- [ ] Send a chat message
- [ ] Verify "Save" button appears next to Send button
- [ ] Button should show text "Save"

### Test 3.2: Save Functionality
- [ ] Send at least 2 messages (user + AI response)
- [ ] Click "Save" button
- [ ] Verify "✓ Saved" feedback appears
- [ ] Check console for success message
- [ ] No error toasts

### Test 3.3: Save Button States
- [ ] Before save: Gray background
- [ ] After save: Green background with "✓ Saved"
- [ ] After 2 seconds: Returns to "Save"
- [ ] Clicking save again should work (upsert)

### Test 3.4: Edge Cases
- [ ] Save chat with only 1 message
- [ ] Save chat with 10+ messages
- [ ] Save chat with markdown formatting in responses
- [ ] Save chat with code blocks in responses

**Expected Result:** Chat saves to Supabase with:
- `item_type`: "chat"
- `content.messages`: plain text formatted as `user: "message"\nsystem: "response"`
- All chat history included

---

## Test 4: Authentication & Error Handling

### Test 4.1: Unauthenticated User
- [ ] Log out from extension
- [ ] Try to access any tab with save button
- [ ] Verify user sees login screen instead
- [ ] Save buttons should not be accessible

### Test 4.2: Network Error Handling
- [ ] Stop backend server
- [ ] Try to save any item
- [ ] Verify error toast appears with message
- [ ] Console should show error
- [ ] Save button should not show "✓ Saved" feedback

### Test 4.3: Quota Limits (Free Tier)
- [ ] As free tier user, save 25 items (max limit)
- [ ] Try to save 26th item
- [ ] Verify error message: "You have reached the limit for saved content."
- [ ] Error toast should appear

---

## Test 5: Cross-Tab Consistency

### Test 5.1: Multiple Saves from Same Video
- [ ] Save transcript for video A
- [ ] Save summary for video A
- [ ] Save chat for video A
- [ ] Verify all 3 items save successfully (3 separate rows in DB)

### Test 5.2: Update Existing Save (Upsert)
- [ ] Save transcript for video A
- [ ] Modify transcript (switch language)
- [ ] Save again
- [ ] Verify only 1 row exists in DB (updated, not duplicated)

### Test 5.3: Different Videos
- [ ] Navigate to video A, save transcript
- [ ] Navigate to video B, save transcript
- [ ] Verify 2 separate rows in DB

---

## Test 6: Visual & UX Polish

### Test 6.1: Button Styling
- [ ] Save buttons match design system (same style as Copy/Export)
- [ ] Hover states work correctly
- [ ] Active/clicked states are smooth
- [ ] Text is readable and not truncated

### Test 6.2: Feedback Timing
- [ ] "✓ Saved" feedback is visible for exactly 2 seconds
- [ ] Transition from "Save" → "✓ Saved" → "Save" is smooth
- [ ] No flickering or layout shifts

### Test 6.3: Accessibility
- [ ] Button has proper `title` tooltip on hover
- [ ] Disabled state (if applicable) is clear
- [ ] Button is keyboard accessible (tab navigation)

---

## Test 7: Database Verification

### Test 7.1: Supabase Data Check
Using Supabase Dashboard or SQL:

```sql
-- Check all saved items for test user
SELECT
  id,
  user_id,
  video_id,
  item_type,
  created_at,
  expires_at,
  content->>'videoTitle' as video_title
FROM saved_items
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

- [ ] Transcript row exists with correct `item_type`
- [ ] Summary row exists with correct `format` in content
- [ ] Chat row exists with correct `messages` in content
- [ ] `expires_at` is 30 days from now (free tier)
- [ ] `created_at` timestamp is accurate

### Test 7.2: Content Integrity
- [ ] Transcript content includes full segments array
- [ ] Summary content includes markdown formatting
- [ ] Chat content includes all messages in plain text format
- [ ] No data truncation or corruption

---

## Test Results Summary

| Test Category | Status | Notes |
|--------------|--------|-------|
| Transcript Tab | ⬜ | |
| Summary Tab | ⬜ | |
| Chat Tab | ⬜ | |
| Authentication | ⬜ | |
| Cross-Tab | ⬜ | |
| Visual/UX | ⬜ | |
| Database | ⬜ | |

**Overall Result:** ⬜ PASS / ⬜ FAIL

---

## Issues Found
(List any bugs or issues discovered during testing)

1.
2.
3.

---

## Additional Notes
(Any observations, suggestions, or feedback)


