/**
 * WXT yapılandırması — eklentinin manifest.json'u buradan üretilir.
 * `npm run dev` geliştirme modunda Chrome'u eklenti yüklü açar, `npm run build` derler.
 */
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.', // entrypoints/, adapters/, lib/ doğrudan extension/ altında
  manifest: {
    name: 'Smarter Prompt',
    description: "Prompt'unu 5 farklı stratejiyle geliştirir; sen seçersin.",
    permissions: ['storage'], // ileride ayarlar sayfası için (chrome.storage)
    // Arka plan betiğinin istek atabileceği adresler. Sunucu taşınınca buraya eklenir.
    host_permissions: ['http://localhost:8000/*'],
    // Klavye kısayolu: chrome://extensions/shortcuts adresinden kullanıcı değiştirebilir
    commands: {
      gelistir: {
        suggested_key: { default: 'Ctrl+Shift+E' },
        description: "Yazı kutusundaki prompt'u geliştir",
      },
    },
  },
});
