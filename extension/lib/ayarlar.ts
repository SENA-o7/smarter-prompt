/**
 * KULLANICI AYARLARI (chrome.storage)
 *
 * "sync:" ile başlayanlar kullanıcının Google hesabıyla cihazlar arasında eşitlenir.
 * "local:" ile başlayanlar yalnızca bu tarayıcıda kalır.
 * Ayarlar sayfası: entrypoints/options/ (eklenti simgesine sağ tık → Seçenekler).
 */
import { storage } from 'wxt/utils/storage';
import { SUNUCU_URL } from './config';

/** Geliştirilmiş prompt'ların dili. auto = kullanıcının yazdığı dilde. */
export const dilAyari = storage.defineItem<'auto' | 'tr' | 'en'>('sync:dil', { fallback: 'auto' });

/**
 * Çalışma modu:
 *  - bulut: bizim sunucumuz + model sağlayıcısı (varsayılan, en iyi kalite)
 *  - yerel: Chrome'un yerleşik Gemini Nano modeli; veri bilgisayardan çıkmaz (deneysel)
 */
export const modAyari = storage.defineItem<'bulut' | 'yerel'>('sync:mod', { fallback: 'bulut' });

/**
 * Kullanıcı çalışmasına katılım onayı (7-8. hafta). Varsayılan KAPALI.
 * Açıksa yalnızca anonim seçim bilgisi gönderilir: hangi strateji, görev türü, düzenlendi mi,
 * ne kadar sürede seçildi. PROMPT METNİ ASLA GÖNDERİLMEZ.
 */
export const kayitOnayi = storage.defineItem<boolean>('sync:kayitOnayi', { fallback: false });

/**
 * Anonim katılımcı kimliği: rastgele üretilir, isim/e-posta ile bağlantısı yoktur.
 * Aynı kişinin seçimlerini bir arada analiz edebilmek için (ör. "bu kişi hep detaylı seçiyor").
 */
export const oturumKimligi = storage.defineItem<string>('local:oturumId', {
  init: () => crypto.randomUUID(),
});

/**
 * Sunucu adresi (ör. https://smarter-prompt.onrender.com). Ayarlar sayfasından değişir;
 * değiştirirken Chrome kullanıcıdan o adrese erişim izni ister.
 */
export const sunucuAdresi = storage.defineItem<string>('sync:sunucuAdresi', { fallback: SUNUCU_URL });
