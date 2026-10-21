import { describe, expect, it } from 'vitest';
import { adaptoruSec, SITE_KALIPLARI } from '../adapters';

describe('adaptoruSec', () => {
  it.each([
    ['chatgpt.com', 'chatgpt'],
    ['chat.openai.com', 'chatgpt'],
    ['claude.ai', 'claude'],
    ['gemini.google.com', 'gemini'],
  ])('%s → %s', (host, site) => {
    expect(adaptoruSec(host)?.site).toBe(site);
  });

  it('desteklenmeyen sitede null döner', () => {
    expect(adaptoruSec('example.com')).toBeNull();
  });

  it('her site için içerik betiği kalıbı var', () => {
    expect(SITE_KALIPLARI).toContain('https://claude.ai/*');
    expect(SITE_KALIPLARI).toContain('https://gemini.google.com/*');
  });
});
