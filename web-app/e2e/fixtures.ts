import { test as base, expect, type Page } from '@playwright/test';

const BACKEND = 'http://localhost:8000';

export const SAVED_ITEMS = [
  {
    id: 'item-1',
    video_id: 'jNQXAC9IVRw',
    item_type: 'transcript',
    source: 'extension',
    created_at: '2026-11-01T10:00:00Z',
    content: {
      videoTitle: 'Me at the zoo',
      videoThumbnail: '',
      segments: [
        { text: 'All right, so here we are in front of the elephants', timestamp: '00:01', start_seconds: 1, duration: 4 },
      ],
    },
  },
];

/** Stub every backend call so tests never leave the machine. */
export async function mockBackend(page: Page, items: unknown[] = SAVED_ITEMS) {
  await page.route(`${BACKEND}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/saved-items/list') {
      return route.fulfill({ json: { success: true, items } });
    }
    // Anything else (config, auth refresh, ...) is unexpected here: fail loudly but harmlessly.
    return route.fulfill({ status: 404, json: { success: false, error: `unmocked: ${url.pathname}` } });
  });
}

/** Pretend the user is signed in (token far from expiry so no refresh is attempted). */
export async function signIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('mintclip_access_token', 'test-access-token');
    localStorage.setItem('mintclip_refresh_token', 'test-refresh-token');
    localStorage.setItem('mintclip_token_expires_at', String(Date.now() + 24 * 60 * 60 * 1000));
    localStorage.setItem('mintclip_user', JSON.stringify({ email: 'e2e@example.com', name: 'E2E User' }));
  });
}

export const test = base.extend<{ signedOutPage: Page; signedInPage: Page }>({
  signedOutPage: async ({ page }, use) => {
    await mockBackend(page);
    await use(page);
  },
  signedInPage: async ({ page }, use) => {
    await mockBackend(page);
    await signIn(page);
    await use(page);
  },
});

export { expect };
