# OAuth Authentication Flow Fix

## Problem

When signing in with Google OAuth on the web app, users were seeing an "Authentication Failed" message briefly before the page reloaded to show the dashboard.

## Root Causes

### 1. **Error Handling Mismatch**
- Backend returns errors with `detail` field (FastAPI HTTPException standard)
- Frontend was only checking for `message` field
- This caused legitimate errors to show generic "Failed to authenticate" message

### 2. **Page Reload Flash**
- Using `window.location.href = '/dashboard'` causes full page reload
- This creates a brief flash where:
  1. OAuth callback shows "Signing you in..."
  2. Page reloads
  3. Dashboard loads with auth state
- User sees the loading screen unnecessarily

### 3. **Insufficient Error Logging**
- No console logs made debugging difficult
- Couldn't easily identify OAuth flow issues

## Solutions Applied

### 1. Fixed Error Response Handling

**File**: `web-app/src/components/AuthCallback.tsx`

**Before**:
```typescript
const data = await response.json();

if (!data.tokens || !data.tokens.access_token) {
  setError(data.message || 'Failed to authenticate');
  // ...
}
```

**After**:
```typescript
if (!response.ok) {
  const errorData = await response.json();
  const errorMessage = errorData.detail || errorData.message || 'Failed to authenticate';
  console.error('[AuthCallback] Backend auth error:', {
    status: response.status,
    statusText: response.statusText,
    error: errorData
  });
  setError(errorMessage);
  setTimeout(() => navigate('/'), 3000);
  return;
}

const data = await response.json();

if (!data.tokens || !data.tokens.access_token) {
  setError(data.detail || data.message || 'Failed to authenticate');
  // ...
}
```

**Changes**:
- Check `response.ok` before parsing JSON
- Handle both `detail` (FastAPI) and `message` (custom) fields
- Add detailed error logging

### 2. Replaced Full Page Reload with React Router Navigation

**Before**:
```typescript
// Redirect to dashboard directly (forces page reload to update auth state)
window.location.href = '/dashboard';
```

**After**:
```typescript
// Navigate to dashboard using React Router (no flash of error screen)
navigate('/dashboard', { replace: true });
```

**Benefits**:
- No page flash/reload
- Faster navigation
- Better user experience
- Uses `replace: true` to prevent back button issues

### 3. Added Comprehensive Logging

Added logging at every critical step:

```typescript
// 1. Initial callback processing
console.log('[AuthCallback] Processing OAuth callback', {
  hasCode: !!code,
  hasError: !!errorParam,
  url: window.location.href
});

// 2. Token exchange start
console.log('[AuthCallback] Exchanging code for tokens...');

// 3. Token exchange success
console.log('[AuthCallback] Token exchange successful', {
  hasTokens: !!data.tokens,
  hasUser: !!data.user
});

// 4. Final redirect
console.log('[AuthCallback] Auth successful, redirecting to dashboard');
```

## Testing

To verify the fix works:

1. **Start backend**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start webapp**:
   ```bash
   cd web-app
   npm run dev
   ```

3. **Test OAuth flow**:
   - Navigate to webapp
   - Click "Sign In with Google"
   - Complete Google OAuth consent
   - Verify smooth redirect to dashboard (no flash)
   - Check browser console for logs

4. **Expected Console Output** (success):
   ```
   [AuthCallback] Processing OAuth callback { hasCode: true, hasError: false, url: "..." }
   [AuthCallback] Exchanging code for tokens...
   [AuthCallback] Token exchange successful { hasTokens: true, hasUser: true }
   [AuthCallback] Auth successful, redirecting to dashboard
   ```

5. **Expected Console Output** (error):
   ```
   [AuthCallback] Processing OAuth callback { hasCode: false, hasError: true, url: "..." }
   [AuthCallback] OAuth error from Google: access_denied User denied access
   ```

## Error Scenarios Handled

1. **User denies OAuth consent**
   - Error param in URL → Show "Authentication failed: [reason]"
   - Auto-redirect to home after 3 seconds

2. **Backend token exchange fails**
   - HTTP error response → Parse `detail` field
   - Show specific error message
   - Log full error details to console

3. **No authorization code**
   - Missing code in URL → Show "No authorization code received"
   - Auto-redirect to home

4. **Network errors**
   - Catch block → Show "Authentication failed"
   - Log error to console

## Files Modified

- `web-app/src/components/AuthCallback.tsx`
  - Fixed error handling (lines 60-71)
  - Added comprehensive logging (lines 24-28, 46-47, 63-67, 74-77, 94)
  - Replaced page reload with React Router (line 97)

## Related Backend Code

The backend `/api/auth/google/code` endpoint (already implemented correctly):

```python
@router.post("/google/code", response_model=AuthResponse)
async def exchange_google_code(request: GoogleAuthCodeRequest):
    # Exchanges Google OAuth code for JWT tokens
    # Returns AuthResponse with tokens and user profile
    # Errors return HTTPException with 'detail' field
```

## Future Improvements

1. **Add loading progress indicator** during token exchange
2. **Implement retry logic** for transient network errors
3. **Add telemetry** to track OAuth success/failure rates
4. **Cache user profile** to avoid extra API call on dashboard load
