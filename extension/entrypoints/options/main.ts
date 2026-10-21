/**
 * AYARLAR SAYFASI: Eklenti simgesine sağ tık → "Seçenekler" ile açılır.
 * Her değişiklik anında chrome.storage'a kaydedilir (kaydet butonu yok).
 */
import { dilAyari, kayitOnayi, modAyari, oturumKimligi } from '../../lib/ayarlar';
import { yerelModelDurumu } from '../../lib/yerel_model';

const DURUM_METNI: Record<string, string> = {
  available: 'hazır ✅',
  downloadable: 'indirilebilir (ilk kullanımda indirilecek)',
  downloading: 'indiriliyor…',
  unavailable: 'bu bilgisayarda desteklenmiyor',
  yok: "bu Chrome sürümünde yok (Chrome 138+ gerekir)",
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function kaydedildi() {
  const p = $('kaydedildi');
  p.textContent = 'Kaydedildi ✓';
  setTimeout(() => (p.textContent = ''), 1500);
}

async function baslat() {
  // Mevcut değerleri forma yükle
  const dil = $<HTMLSelectElement>('dil');
  dil.value = await dilAyari.getValue();
  dil.addEventListener('change', async () => {
    await dilAyari.setValue(dil.value as 'auto' | 'tr' | 'en');
    kaydedildi();
  });

  const mod = await modAyari.getValue();
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="mod"]')) {
    r.checked = r.value === mod;
    r.addEventListener('change', async () => {
      await modAyari.setValue(r.value as 'bulut' | 'yerel');
      kaydedildi();
    });
  }

  const kayit = $<HTMLInputElement>('kayit');
  kayit.checked = await kayitOnayi.getValue();
  kayit.addEventListener('change', async () => {
    await kayitOnayi.setValue(kayit.checked);
    kaydedildi();
  });

  $('oturum').textContent = (await oturumKimligi.getValue()).slice(0, 8);
  $('yerelDurum').textContent = DURUM_METNI[await yerelModelDurumu()] ?? 'bilinmiyor';
}

baslat();
