# Chrome Web Store Submission Notes

## Extension Details
- **Extension ID:** kbalipdjcmliicfodacdbgngflaelnnm
- **Extension Name:** Mintclip
- **Version:** 0.1.1

## Production URLs
- **Backend:** https://mintclip-production.up.railway.app
- **Web App:** https://mintclip.up.railway.app

## Reviewer Notes

### Authentication
The extension uses **Google OAuth only** via `chrome.identity.getAuthToken`.

Reviewers must sign in with their **own Google account** — there is no separate username/password flow. When clicking "Sign in with Google", Chrome will show a Google account picker using the account signed into the browser.

### Tester Credentials (DO NOT USE for extension login)
The following credentials are for the Supabase user account only (not for extension login):
- **Email:** mintclip.reviewer@gmail.com
- **Password:** MintclipReview2024!

These credentials cannot be used to log into the extension — the extension only supports Google OAuth.

## Rejection History

### v0.1.0 - Rejected (2026-02-19)
1. **Blue Argon** - Remotely hosted code in `src/content/index.js`
   - **Cause:** jsPDF library contained URLs to cdnjs.cloudflare.com
   - **Fix:** Removed jsPDF dependency and PDF export feature

2. **Red Potassium** - OAuth login not working
   - **Cause:** Google OAuth consent screen was in "Testing" mode — only listed test users could log in
   - **Fix:** Published OAuth consent screen to Production mode

### v0.1.1 - Resubmitted (2026-02-19)
Both issues fixed and resubmitted.
