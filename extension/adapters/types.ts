/**
 * SİTE ADAPTÖRLERİ — ortak arayüz ve yardımcılar
 *
 * Her sohbet sitesinin (ChatGPT, Claude, Gemini) yazı kutusu farklıdır. Adaptör, içerik
 * betiğine "kutuyu bul / metni oku / metni yaz" işlerini site fark etmeksizin aynı şekilde
 * yapma imkânı verir. Yeni site eklemek = yeni bir adaptör dosyası yazmak.
 */
import type { Site } from '../lib/schema';

export interface SiteAdapter {
  site: Site;
  /** Yazı kutusunu döndürür; sayfa henüz yüklenmediyse null. */
  kutuyuBul(): HTMLElement | null;
  metniOku(kutu: HTMLElement): string;
  metniYaz(kutu: HTMLElement, metin: string): void;
}

/**
 * Seçicileri sırayla dener, ilk eşleşeni döndürür.
 * Siteler HTML yapısını sık değiştirir; birincil seçici kırılırsa yedekler devreye girer.
 */
export function ilkEslesen(seciciler: string[]): HTMLElement | null {
  for (const s of seciciler) {
    const el = document.querySelector<HTMLElement>(s);
    if (el) return el;
  }
  return null;
}

/**
 * Yazı kutusuna metin yazar.
 *
 * TUZAK: ChatGPT ve Claude'un yazı kutusu düz bir <textarea> değil, React/ProseMirror
 * editörüdür. `kutu.value = metin` veya `innerText` ataması ekranda görünse bile sitenin
 * kendi durumu güncellenmez, "Gönder" eski metni gönderir. Bu yüzden kutuya odaklanıp
 * tüm metni seçiyor ve `insertText` komutuyla — kullanıcı yazıyormuş gibi — yazıyoruz.
 */
export function editoreYaz(kutu: HTMLElement, metin: string): void {
  kutu.focus();
  if (kutu instanceof HTMLTextAreaElement) {
    kutu.select();
  } else {
    // contenteditable: tüm içeriği seç
    const secim = window.getSelection();
    const aralik = document.createRange();
    aralik.selectNodeContents(kutu);
    secim?.removeAllRanges();
    secim?.addRange(aralik);
  }
  const basarili = document.execCommand('insertText', false, metin);
  if (!basarili) {
    // Yedek yol: doğrudan yaz ve sitenin dinlediği "input" olayını elle tetikle
    if (kutu instanceof HTMLTextAreaElement) kutu.value = metin;
    else kutu.innerText = metin;
    kutu.dispatchEvent(new InputEvent('input', { bubbles: true, data: metin }));
  }
}

/** Yazı kutusundaki metni okur (textarea veya contenteditable). */
export function editoruOku(kutu: HTMLElement): string {
  return (kutu instanceof HTMLTextAreaElement ? kutu.value : kutu.innerText).trim();
}
