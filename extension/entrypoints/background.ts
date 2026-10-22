/**
 * ARKA PLAN BETİĞİ (service worker)
 *
 * Eklentinin "görünmeyen" kısmı. Görevleri:
 *  1. "gelistir" mesajı → ayarlardaki moda göre sunucuya (bulut) ya da Gemini Nano'ya (yerel) git.
 *  2. "olay" mesajı → kullanıcı onay verdiyse anonim seçim kaydını sunucuya gönder (POST /event).
 *  3. Ctrl+Shift+E kısayolunu aktif sekmeye iletmek.
 *
 * Neden sunucuya içerik betiğinden değil de buradan istek atıyoruz?
 * İçerik betiği sohbet sitesinin içinde çalışır; oradan localhost'a istek atmak sitenin
 * güvenlik kurallarına (CSP/CORS) takılabilir. Arka plan betiği eklentinin kendi
 * izinleriyle (wxt.config.ts → host_permissions) çalışır.
 */
import { dilAyari, kayitOnayi, modAyari, oturumKimligi, sunucuAdresi } from '../lib/ayarlar';
import {
  EnhanceResponseSchema,
  type GelistirCevabi,
  type GelistirIstegi,
  type GeriBildirimMesaji,
  type OlayMesaji,
} from '../lib/schema';
import { performansEkle } from '../lib/performans';
import { yerelGelistir } from '../lib/yerel_model';

// Basit önbellek: Aynı prompt'a tekrar "Geliştir" denirse sunucuya tekrar gitmeyiz
// (hem hızlı hem ucuz). Service worker uykuya geçince sıfırlanır; bu yeterli.
const ONBELLEK_BOYUTU = 50;
const onbellek = new Map<string, GelistirCevabi>();

async function bulutGelistir(istek: GelistirIstegi, dil: string): Promise<GelistirCevabi> {
  try {
    const r = await fetch(`${await sunucuAdresi.getValue()}/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: istek.prompt, site: istek.site, dil, gorev_turu: istek.gorev_turu }),
    });
    const govde = await r.json().catch(() => null);

    // Sunucu hata döndürdüyse (429 kota/hız sınırı, 502 bozuk cevap, 503 model kapalı)
    // sunucunun Türkçe hata mesajını kullanıcıya gösteririz.
    if (!r.ok) {
      const detay = typeof govde?.detail === 'string' ? govde.detail : `Sunucu hatası (HTTP ${r.status})`;
      return { ok: false, hata: detay };
    }

    // Sunucuya da güvenmiyoruz: cevap sözleşmeye (Zod şeması) uymuyorsa panel bozulmasın.
    const sonuc = EnhanceResponseSchema.safeParse(govde);
    if (!sonuc.success) return { ok: false, hata: 'Sunucu beklenmeyen bir cevap döndürdü.' };
    return { ok: true, veri: sonuc.data };
  } catch {
    // fetch hiç cevap alamadıysa (sunucu kapalı, ağ yok)
    return { ok: false, hata: 'Sunucuya ulaşılamadı. Sunucu açık mı? Adresi Ayarlar sayfasından kontrol edin.' };
  }
}

async function gelistir(istek: GelistirIstegi): Promise<GelistirCevabi> {
  const baslangic = performance.now();
  const [mod, dil] = await Promise.all([modAyari.getValue(), dilAyari.getValue()]);
  const anahtar = `${mod}|${dil}|${istek.gorev_turu ?? 'oto'}|${istek.prompt.trim()}`;
  const kayitli = onbellek.get(anahtar);
  if (kayitli) {
    olcumuKaydet(istek, kayitli, baslangic, true);
    return kayitli;
  }

  const cevap = await modelden(istek, mod, dil);
  olcumuKaydet(istek, cevap, baslangic, false);
  if (cevap.ok) {
    onbellek.set(anahtar, cevap);
    // Map ekleme sırasını korur; ilk anahtar en eski kayıttır.
    if (onbellek.size > ONBELLEK_BOYUTU) onbellek.delete(onbellek.keys().next().value!);
  }
  return cevap;
}

/** Süre ve sonucu yalnızca bu tarayıcıda saklar (Ayarlar → Performans). Prompt metni saklanmaz. */
function olcumuKaydet(istek: GelistirIstegi, cevap: GelistirCevabi, baslangic: number, onbellekten: boolean) {
  performansEkle({
    zaman: new Date().toISOString(),
    ok: cevap.ok,
    uctan_uca_ms: Math.round(performance.now() - baslangic),
    sunucu_ms: cevap.ok ? cevap.veri.sure_ms : null,
    model: cevap.ok ? cevap.veri.model : null,
    site: istek.site,
    onbellekten,
    hata: cevap.ok ? null : cevap.hata,
  }).catch(() => {});
}

async function modelden(istek: GelistirIstegi, mod: string, dil: string): Promise<GelistirCevabi> {
  let cevap: GelistirCevabi;
  if (mod === 'yerel') {
    cevap = await yerelGelistir(istek.prompt);
    // Yerel model yoksa/başarısızsa buluta otomatik geri dön (rehber 6.5)
    if (!cevap.ok) cevap = await bulutGelistir(istek, dil);
  } else {
    cevap = await bulutGelistir(istek, dil);
  }
  return cevap;
}

/** Anonim seçim kaydı. Onay yoksa HİÇBİR ŞEY gönderilmez. */
async function olayGonder(mesaj: OlayMesaji) {
  if (!(await kayitOnayi.getValue())) return;
  const oturum_id = await oturumKimligi.getValue();
  await fetch(`${await sunucuAdresi.getValue()}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...mesaj.olay, oturum_id }),
  }).catch(() => {}); // kayıt başarısız olsa bile kullanıcıyı rahatsız etme
}

/**
 * Paneldeki 👍/👎 geri bildirimi. Kullanıcı butona basarak kendisi gönderdiği için araştırma
 * onayından bağımsızdır; yine de prompt metni içermez. Başarılı olup olmadığını panele bildirir.
 */
async function geriBildirimGonder(mesaj: GeriBildirimMesaji): Promise<boolean> {
  const oturum_id = await oturumKimligi.getValue();
  try {
    const r = await fetch(`${await sunucuAdresi.getValue()}/geri-bildirim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mesaj.gb, oturum_id }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export default defineBackground(() => {
  // İçerik betiğinden gelen mesajları dinle.
  browser.runtime.onMessage.addListener(
    (mesaj: GelistirIstegi | OlayMesaji | GeriBildirimMesaji, _gonderen, cevapla) => {
    if (mesaj?.tur === 'gelistir') {
      gelistir(mesaj).then(cevapla);
      return true; // "cevabı sonra vereceğim" demek; asenkron cevap için şart
    }
    if (mesaj?.tur === 'geri_bildirim') {
      geriBildirimGonder(mesaj).then(cevapla);
      return true;
    }
    if (mesaj?.tur === 'olay') olayGonder(mesaj);
    },
  );

  // Ctrl+Shift+E (wxt.config.ts → commands) → aktif sekmeye "kisayol" mesajı gönder.
  browser.commands.onCommand.addListener(async (komut) => {
    if (komut !== 'gelistir') return;
    const [sekme] = await browser.tabs.query({ active: true, currentWindow: true });
    // Desteklenmeyen bir sitedeysek içerik betiği yoktur; hatayı sessizce yut.
    if (sekme?.id) browser.tabs.sendMessage(sekme.id, { tur: 'kisayol' }).catch(() => {});
  });
});
