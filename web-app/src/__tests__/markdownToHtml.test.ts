/**
 * markdownToHtml.test.ts
 *
 * Security regression tests for the chat markdown renderer, which feeds
 * dangerouslySetInnerHTML. Untrusted transcript/LLM output must NOT be able to
 * inject executable HTML (stored XSS → localStorage JWT theft).
 */

// The component imports API utils that touch import.meta / network; mock them
// so importing the module under test stays side-effect free.
jest.mock('../utils/api', () => ({}), { virtual: true });
jest.mock('../utils/supabase', () => ({}), { virtual: true });

import { markdownToHtml } from '../components/modal/SavedItemModal';

describe('markdownToHtml — XSS hardening', () => {
  it('escapes raw HTML tags instead of emitting them', () => {
    const out = markdownToHtml('<img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain('&lt;img');
  });

  it('escapes script tags', () => {
    const out = markdownToHtml('<script>alert(document.cookie)</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('&lt;script&gt;');
  });

  it('neutralizes javascript: links', () => {
    const out = markdownToHtml('[click](javascript:alert(1))');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('href="#"');
  });

  it('neutralizes data: links', () => {
    const out = markdownToHtml('[x](data:text/html,<script>alert(1)</script>)');
    expect(out).not.toContain('href="data:');
  });

  it('still renders safe markdown correctly', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
    expect(markdownToHtml('`code`')).toContain('<code');
    const link = markdownToHtml('[label](https://example.com)');
    expect(link).toContain('href="https://example.com"');
    expect(link).toContain('>label</a>');
  });
});
