import { test, expect, mockBackend, signIn } from './fixtures';

test.describe('signed out', () => {
  test('landing page shows headline and sign-in call to action', async ({ signedOutPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('protected routes redirect to landing', async ({ signedOutPage: page }) => {
    for (const path of ['/dashboard', '/notifications']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('unknown routes redirect to landing', async ({ signedOutPage: page }) => {
    await page.goto('/definitely-not-a-page');
    await expect(page).toHaveURL(/\/$/);
  });

  test('legal pages are public and render', async ({ signedOutPage: page }) => {
    for (const slug of [
      'privacy-policy',
      'terms-of-service',
      'cookie-policy',
      'gdpr-compliance',
      'data-processing-agreement',
    ]) {
      await page.goto(`/legal/${slug}`);
      await expect(page).toHaveURL(new RegExp(`/legal/${slug}$`));
      await expect(page.getByRole('heading').first()).toBeVisible();
    }
  });
});

test.describe('signed in', () => {
  test('landing redirects to dashboard and lists saved videos', async ({ signedInPage: page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Me at the zoo')).toBeVisible();
  });

  test('dashboard shows the empty state when nothing is saved', async ({ page }) => {
    await mockBackend(page, []);
    await signIn(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Me at the zoo')).toHaveCount(0);
  });

  test('opening a saved video shows its transcript', async ({ signedInPage: page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByText('in front of the elephants')).toBeVisible();
  });
});
