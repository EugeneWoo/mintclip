# User Profile Dropdown Implementation

## Overview
Implemented a GDPR-compliant user profile dropdown menu in the Mintclip webapp dashboard that displays the user's initial (from name or email) instead of a generic "U".

## Changes Made

### New Component: UserProfileDropdown.tsx
**Location**: `web-app/src/components/UserProfileDropdown.tsx`

**Features**:
1. **User Initial Display**
   - Fetches user profile from `/api/auth/me` endpoint
   - Displays first letter of display_name or email
   - Fallback to "U" if no data available
   - Stores user data in localStorage for offline fallback

2. **Dropdown Menu** (matches design-mocks/dashboard-framer.html)
   - Header with user's name and email
   - Account section with Privacy Settings link
   - Data & Privacy section with:
     - Export My Data (downloads JSON via `/api/auth/gdpr/export`)
     - Delete Account (triggers `/api/auth/gdpr/delete`)
   - Sign Out option (calls `/api/auth/logout`)

3. **GDPR Compliance**
   - Data export downloads full user data as JSON
   - Account deletion with double confirmation
   - Privacy settings link to /privacy page
   - All using existing backend GDPR endpoints

4. **UI/UX Features**
   - Click outside to close
   - Hover effects matching design system
   - Green gradient avatar circle
   - Dropdown arrow rotates on open
   - Mobile-friendly (hides user name on small screens)

### Updated Component: Dashboard.tsx
**Location**: `web-app/src/components/Dashboard.tsx`

**Changes**:
- Imported UserProfileDropdown component
- Replaced hardcoded "U" avatar with `<UserProfileDropdown />`
- Connected onDeleteAccount callback to refresh saved items

## Backend Integration

Uses existing GDPR-compliant endpoints from `backend/app/routes/auth.py`:

1. **GET /api/auth/me** - Fetch user profile
   - Returns: id, email, display_name, avatar_url, tier, usage stats

2. **GET /api/auth/gdpr/export** - Export user data
   - Returns: JSON with all user data (profile, saved items, usage history)
   - Client downloads as `mintclip-data-export-YYYY-MM-DD.json`

3. **POST /api/auth/gdpr/delete** - Delete account
   - Permanently deletes user data
   - Requires double confirmation in UI

4. **POST /api/auth/logout** - Sign out
   - Invalidates session
   - Clears local storage

## Testing

To test the implementation:

```bash
# Start backend (if not running)
cd backend
uvicorn app.main:app --reload --port 8000

# Start webapp
cd web-app
npm run dev
```

Then:
1. Navigate to http://localhost:5173 (or configured Vite port)
2. Sign in with Google OAuth
3. Click on the user initial in top-right corner
4. Verify dropdown menu appears with all options
5. Test each menu option:
   - Privacy Settings → navigates to /privacy
   - Export My Data → downloads JSON file
   - Delete Account → shows double confirmation
   - Sign Out → clears session and redirects

## Design Reference
Matches the design from `web-app/design-mocks/dashboard-framer.html`:
- Account dropdown structure (lines 936-986)
- Styling: dark theme, rounded borders, hover effects
- Color scheme: Green accent (#22c55e), dark backgrounds
- Typography: Plus Jakarta Sans (headings), Inter (body)

## Files Modified
1. `web-app/src/components/UserProfileDropdown.tsx` (NEW)
2. `web-app/src/components/Dashboard.tsx` (UPDATED)

## Notes
- User profile data is cached in localStorage for offline access
- All API calls include automatic token refresh via auth.ts
- Double confirmation prevents accidental account deletion
- Mobile responsive (hides user name on <768px screens)
