/**
 * Varsayılan sunucu adresi.
 *
 * Kullanıcı bunu eklentinin Ayarlar sayfasından ("Sunucu adresi") değiştirebilir; böylece aynı eklenti
 * hem kendi bilgisayarındaki sunucuya (bilgisayar öğrencileri, geliştirme) hem de ekibin ortak
 * sunucusuna (kullanıcı çalışması, geri bildirimlerin tek yerde toplanması) bağlanabilir.
 * Kullanılan değer: lib/ayarlar.ts → sunucuAdresi.
 */
export const SUNUCU_URL = 'http://localhost:8000';

/** "https://ornek.onrender.com/" gibi bir girdiyi "https://ornek.onrender.com" biçimine getirir; geçersizse null. */
export function sunucuAdresiniDuzelt(girdi: string): string | null {
  try {
    const url = new URL(girdi.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Güvenlik: şifresiz http yalnızca kendi bilgisayarına izinli
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}
