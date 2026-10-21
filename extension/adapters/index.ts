/**
 * Sayfanın adresine (hostname) göre doğru site adaptörünü seçer.
 * Yeni bir site eklerken: adaptör dosyasını yaz → buraya ekle → wxt içerik betiğindeki
 * `matches` listesine ve tests/adapters.test.ts'e ekle.
 */
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';
import type { SiteAdapter } from './types';

const SITELER: Record<string, SiteAdapter> = {
  'chatgpt.com': chatgptAdapter,
  'chat.openai.com': chatgptAdapter,
  'claude.ai': claudeAdapter,
  'gemini.google.com': geminiAdapter,
};

/** Desteklenen sitelerin içerik betiği eşleşme kalıpları (wxt `matches`). */
export const SITE_KALIPLARI = Object.keys(SITELER).map((h) => `https://${h}/*`);

export function adaptoruSec(hostname: string): SiteAdapter | null {
  return SITELER[hostname] ?? null;
}
