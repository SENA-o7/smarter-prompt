/**
 * AYARLAR SAYFASI: Eklenti simgesine sağ tık → "Seçenekler" ile açılır.
 * Her değişiklik anında chrome.storage'a kaydedilir (kaydet butonu yok).
 */
import { dilAyari, kayitOnayi, modAyari, oturumKimligi, sunucuAdresi } from '../../lib/ayarlar';
import { sunucuAdresiniDuzelt } from '../../lib/config';
import { ozetle, performansKayitlari, type PerformansKaydi } from '../../lib/performans';
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

/** Sunucu adresi: izin iste → kaydet → /health ile dene ve sonucu göster. */
async function sunucuyuKur() {
  const girdi = $<HTMLInputElement>('sunucu');
  const durum = $('sunucuDurum');
  girdi.value = await sunucuAdresi.getValue();

  $('sunucuKaydet').addEventListener('click', async () => {
    const adres = sunucuAdresiniDuzelt(girdi.value);
    if (!adres) {
      durum.textContent = '❌ Geçersiz adres. https://… ya da http://localhost:8000 biçiminde yazın.';
      return;
    }
    // Chrome, eklentinin bu adrese istek atabilmesi için kullanıcıdan izin ister (buton tıklamasıyla olmalı)
    const izin = await browser.permissions.request({ origins: [`${adres}/*`] }).catch(() => false);
    if (!izin) {
      durum.textContent = '❌ İzin verilmedi; eklenti bu adrese bağlanamaz.';
      return;
    }
    await sunucuAdresi.setValue(adres);
    girdi.value = adres;
    durum.textContent = '⏳ Deneniyor…';
    try {
      const govde = await (await fetch(`${adres}/health`)).json();
      durum.textContent = `✅ Bağlandı · model: ${govde.model} · meta-prompt: ${govde.meta_prompt}`;
    } catch {
      durum.textContent = '⚠️ Kaydedildi ama sunucuya ulaşılamadı. Sunucu açık mı?';
    }
  });
}

async function baslat() {
  await sunucuyuKur();
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

  // Performans: açılışta çiz, yeni istek gelince (sayfa açıkken) kendiliğinden güncelle
  performansiCiz(await performansKayitlari.getValue());
  performansKayitlari.watch((yeni) => performansiCiz(yeni ?? []));
  $('pTemizle').addEventListener('click', () => performansKayitlari.setValue([]));
}

const sn = (ms: number | null) => (ms === null ? '–' : `${(ms / 1000).toFixed(1)} sn`);
const yuzde = (o: number | null) => (o === null ? '–' : `%${Math.round(o * 100)}`);

function performansiCiz(kayitlar: PerformansKaydi[]) {
  const o = ozetle(kayitlar);
  $('pIstek').textContent = String(o.istek);
  $('pBasari').textContent = o.istek ? yuzde(o.basari_orani) : '–';
  $('pMedyan').textContent = sn(o.medyan_ms);
  $('pHedef').textContent = yuzde(o.hedef_alti_orani);

  const tablo = $('pTablo');
  if (!kayitlar.length) return;
  tablo.replaceChildren(
    ...kayitlar.slice(0, 15).map((k) => {
      const tr = document.createElement('tr');
      const sonuc = k.onbellekten ? '♻️ önbellek' : k.ok ? '✅ tamam' : `❌ ${k.hata ?? 'hata'}`;
      for (const hucre of [
        new Date(k.zaman).toLocaleTimeString('tr-TR'),
        k.site,
        sonuc,
        sn(k.uctan_uca_ms),
        sn(k.sunucu_ms),
      ]) {
        const td = document.createElement('td');
        td.textContent = hucre; // textContent: hata mesajı HTML olarak yorumlanmasın
        tr.append(td);
      }
      return tr;
    }),
  );
}

baslat();
