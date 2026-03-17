/**
 * Manifest validation tests
 *
 * These tests catch the class of bug that caused the v0.1.4 auth outage:
 * host_permissions missing the production backend URL, blocking all network
 * requests from the extension silently.
 */

import * as fs from 'fs';
import * as path from 'path';

const manifest = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf-8')
);

// Read the production backend URL directly from config source
// so this test stays in sync if the URL ever changes.
const configSrc = fs.readFileSync(
  path.resolve(__dirname, '../src/config.ts'),
  'utf-8'
);

function extractProductionUrl(src: string, varName: string): string | null {
  // Match: : 'https://...' after the variable name in the ternary
  const re = new RegExp(
    `${varName}[\\s\\S]*?isDevelopment[\\s\\S]*?:[\\s]*['"]([^'"]+)['"]`
  );
  const match = src.match(re);
  return match ? match[1] : null;
}

const productionBackendUrl = extractProductionUrl(configSrc, 'defaultBackendUrl');
const productionWebAppUrl  = extractProductionUrl(configSrc, 'defaultWebAppUrl');

describe('manifest.json — host_permissions', () => {
  const hostPerms: string[] = manifest.host_permissions ?? [];

  test('host_permissions array exists and is non-empty', () => {
    expect(Array.isArray(hostPerms)).toBe(true);
    expect(hostPerms.length).toBeGreaterThan(0);
  });

  test('production backend URL is covered by host_permissions', () => {
    expect(productionBackendUrl).not.toBeNull();
    const covered = hostPerms.some(
      (p) => productionBackendUrl!.startsWith(p.replace('/*', ''))
    );
    expect(covered).toBe(true);
  });

  test('production web-app URL is covered by host_permissions', () => {
    expect(productionWebAppUrl).not.toBeNull();
    const covered = hostPerms.some(
      (p) => productionWebAppUrl!.startsWith(p.replace('/*', ''))
    );
    expect(covered).toBe(true);
  });

  test('YouTube origin is covered by host_permissions', () => {
    const covered = hostPerms.some((p) => p.includes('youtube.com'));
    expect(covered).toBe(true);
  });

  test('no localhost URLs are in host_permissions (would be rejected by CWS)', () => {
    const localEntries = hostPerms.filter((p) => p.includes('localhost') || p.includes('127.0.0.1'));
    expect(localEntries).toHaveLength(0);
  });
});

describe('manifest.json — permissions', () => {
  const perms: string[] = manifest.permissions ?? [];

  test('identity permission is present (required for Google OAuth)', () => {
    expect(perms).toContain('identity');
  });

  test('storage permission is present (required for auth state)', () => {
    expect(perms).toContain('storage');
  });
});

describe('manifest.json — version', () => {
  test('version field exists and follows semver (major.minor.patch)', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
