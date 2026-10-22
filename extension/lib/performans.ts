/**
 * PERFORMANS KAYDI — yalnızca bu tarayıcıda (chrome.storage.local), hiçbir yere gönderilmez.
 *
 * Her "Geliştir" isteğinin uçtan uca süresi ve sonucu saklanır; ayarlar sayfasının
 * "Performans" bölümü bunu özetler. PROMPT METNİ SAKLANMAZ.
 *
 *   uctan_uca_ms: kullanıcının beklediği toplam süre (eklenti → sunucu → model → geri)
 *   sunucu_ms   : sunucunun ölçtüğü kısım (çoğu model cevabını beklemek)
 *   fark        : ağ ve eklenti payı (uctan_uca - sunucu)
 */
import { storage } from 'wxt/utils/storage';

export type PerformansKaydi = {
  zaman: string; // ISO tarih
  ok: boolean;
  uctan_uca_ms: number;
  sunucu_ms: number | null; // hata veya yerel modda null
  model: string | null;
  site: string;
  onbellekten: boolean;
  hata: string | null;
};

const EN_FAZLA = 50;

export const performansKayitlari = storage.defineItem<PerformansKaydi[]>('local:performans', { fallback: [] });

export async function performansEkle(kayit: PerformansKaydi) {
  const liste = await performansKayitlari.getValue();
  await performansKayitlari.setValue([kayit, ...liste].slice(0, EN_FAZLA));
}

export type PerformansOzeti = {
  istek: number;
  basari_orani: number; // 0-1
  medyan_ms: number | null;
  en_yavas_ms: number | null;
  hedef_alti_orani: number | null; // < 4 sn olanların oranı (başarılı, önbellek hariç)
};

/** Önbellekten gelenler süreyi yapay olarak düşürmesin diye ölçüme katılmaz. */
export function ozetle(kayitlar: PerformansKaydi[]): PerformansOzeti {
  const gercek = kayitlar.filter((k) => !k.onbellekten);
  const basarili = gercek.filter((k) => k.ok).map((k) => k.uctan_uca_ms).sort((a, b) => a - b);
  const orta = Math.floor(basarili.length / 2);
  const medyan =
    basarili.length === 0
      ? null
      : basarili.length % 2
        ? basarili[orta]!
        : Math.round((basarili[orta - 1]! + basarili[orta]!) / 2);
  return {
    istek: gercek.length,
    basari_orani: gercek.length ? gercek.filter((k) => k.ok).length / gercek.length : 0,
    medyan_ms: medyan,
    en_yavas_ms: basarili.length ? basarili[basarili.length - 1]! : null,
    hedef_alti_orani: basarili.length ? basarili.filter((ms) => ms < 4000).length / basarili.length : null,
  };
}
