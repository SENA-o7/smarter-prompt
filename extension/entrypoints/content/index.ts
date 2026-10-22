/**
 * İÇERİK BETİĞİ (content script)
 *
 * Desteklenen sohbet sitelerinin (ChatGPT, Claude, Gemini) İÇİNDE çalışır:
 *  - Sayfanın adresine göre doğru adaptörü seçer (adapters/index.ts).
 *  - Paneli (components/Panel.ts) Shadow DOM içinde çizer: sitenin CSS'i panelimizi,
 *    bizim CSS'imiz de siteyi bozamaz.
 *  - Panelin isteklerini arka plan betiğine iletir.
 */
import './style.css';
import { adaptoruSec, SITE_KALIPLARI } from '../../adapters';
import { Panel } from '../../components/Panel';
import type { GelistirCevabi, GeriBildirimMesaji, OlayMesaji } from '../../lib/schema';

export default defineContentScript({
  matches: SITE_KALIPLARI, // chatgpt.com, chat.openai.com, claude.ai, gemini.google.com
  cssInjectionMode: 'ui', // style.css sayfaya değil Shadow DOM'a enjekte edilsin

  async main(ctx) {
    const adapter = adaptoruSec(location.hostname);
    if (!adapter) return;

    const ui = await createShadowRootUi(ctx, {
      name: 'smarter-prompt-ui',
      position: 'inline',
      anchor: 'body',
      onMount(kok) {
        const panel = new Panel(kok, adapter, {
          gelistir: (istek) => browser.runtime.sendMessage(istek) as Promise<GelistirCevabi>,
          olayGonder: (olay) => {
            const mesaj: OlayMesaji = { tur: 'olay', olay };
            browser.runtime.sendMessage(mesaj).catch(() => {});
          },
          geriBildirim: (gb) => {
            const mesaj: GeriBildirimMesaji = { tur: 'geri_bildirim', gb };
            return browser.runtime.sendMessage(mesaj) as Promise<boolean>;
          },
        });
        // Arka plan betiği Ctrl+Shift+E kısayolunu bildirirse butona basılmış gibi davran
        browser.runtime.onMessage.addListener((m: { tur?: string }) => {
          if (m?.tur === 'kisayol') panel.gelistir();
        });
        return panel;
      },
    });
    ui.mount();
  },
});
