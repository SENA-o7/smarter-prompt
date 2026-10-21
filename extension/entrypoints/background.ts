/**
 * ARKA PLAN BETİĞİ (service worker)
 *
 * Eklentinin "görünmeyen" kısmı. İki görevi var:
 *  1. İçerik betiğinden gelen "gelistir" mesajını alıp sunucuya (/enhance) istek atmak.
 *  2. Ctrl+Shift+E kısayoluna basılınca aktif sekmedeki içerik betiğine haber vermek.
 *
 * Neden sunucuya içerik betiğinden değil de buradan istek atıyoruz?
 * İçerik betiği chatgpt.com sayfasının içinde çalışır; oradan localhost'a istek atmak
 * sitenin güvenlik kurallarına (CSP/CORS) takılabilir. Arka plan betiği ise eklentinin
 * kendi izinleriyle (wxt.config.ts → host_permissions) çalışır.
 */
import { SUNUCU_URL } from '../lib/config';
import { EnhanceResponseSchema, type GelistirCevabi, type GelistirIstegi } from '../lib/schema';

// Basit önbellek: Aynı prompt'a tekrar "Geliştir" denirse sunucuya tekrar gitmeyiz
// (hem hızlı hem ucuz). Service worker uykuya geçince sıfırlanır; bu yeterli.
const ONBELLEK_BOYUTU = 50;
const onbellek = new Map<string, GelistirCevabi>();

async function gelistir(istek: GelistirIstegi): Promise<GelistirCevabi> {
  const anahtar = istek.prompt.trim();
  const kayitli = onbellek.get(anahtar);
  if (kayitli) return kayitli;

  try {
    const r = await fetch(`${SUNUCU_URL}/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: istek.prompt, site: istek.site }),
    });
    const govde = await r.json().catch(() => null);

    // Sunucu hata döndürdüyse (429 hız sınırı, 502 bozuk cevap, 503 model kapalı)
    // sunucunun Türkçe hata mesajını kullanıcıya gösteririz.
    if (!r.ok) {
      const detay = typeof govde?.detail === 'string' ? govde.detail : `Sunucu hatası (HTTP ${r.status})`;
      return { ok: false, hata: r.status === 429 ? 'Çok fazla istek; bir dakika bekleyin.' : detay };
    }

    // Sunucuya da güvenmiyoruz: cevap sözleşmeye (Zod şeması) uymuyorsa panel bozulmasın.
    const sonuc = EnhanceResponseSchema.safeParse(govde);
    if (!sonuc.success) return { ok: false, hata: 'Sunucu beklenmeyen bir cevap döndürdü.' };

    const cevap: GelistirCevabi = { ok: true, veri: sonuc.data };
    onbellek.set(anahtar, cevap);
    // Map ekleme sırasını korur; ilk anahtar en eski kayıttır.
    if (onbellek.size > ONBELLEK_BOYUTU) onbellek.delete(onbellek.keys().next().value!);
    return cevap;
  } catch {
    // fetch hiç cevap alamadıysa (sunucu kapalı, ağ yok)
    return { ok: false, hata: 'Sunucuya ulaşılamadı. Sunucu çalışıyor mu? (uvicorn app.main:app)' };
  }
}

export default defineBackground(() => {
  // İçerik betiğinden gelen mesajları dinle.
  browser.runtime.onMessage.addListener((mesaj: GelistirIstegi, _gonderen, cevapla) => {
    if (mesaj?.tur !== 'gelistir') return;
    gelistir(mesaj).then(cevapla);
    return true; // "cevabı sonra vereceğim" demek; asenkron cevap için şart
  });

  // Ctrl+Shift+E (wxt.config.ts → commands) → aktif sekmeye "kisayol" mesajı gönder.
  browser.commands.onCommand.addListener(async (komut) => {
    if (komut !== 'gelistir') return;
    const [sekme] = await browser.tabs.query({ active: true, currentWindow: true });
    // Desteklenmeyen bir sitedeysek içerik betiği yoktur; hatayı sessizce yut.
    if (sekme?.id) browser.tabs.sendMessage(sekme.id, { tur: 'kisayol' }).catch(() => {});
  });
});
