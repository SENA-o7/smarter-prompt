/**
 * KÜÇÜK RESİMLER — her strateji için elle çizilmiş SVG'ler (Pastel Defter tasarımı, 22.10.2026)
 *
 * Neden resim dosyası değil de SVG metni? Panel Shadow DOM içinde; SVG'yi doğrudan koda gömmek
 * ek dosya/izin gerektirmez, her boyutta keskin görünür ve renkleri tek yerden değişir.
 * Bu metinler bizim sabitlerimizdir (kullanıcı girdisi içermez), bu yüzden innerHTML ile güvenle eklenir.
 */
import type { Secenek } from '../lib/schema';

const svg = (icerik: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${icerik}</svg>`;

export const RESIMLER: Record<Secenek['strateji'] | 'logo', string> = {
  // Net ve kısa: hedef tahtası + ok
  net: svg(`
    <circle cx="22" cy="26" r="15" fill="#ffd8d8"/><circle cx="22" cy="26" r="10" fill="#fff"/>
    <circle cx="22" cy="26" r="5.5" fill="#ff6b6b"/>
    <path d="M22 26 L39 9" stroke="#3b3b58" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M34 8 L40 8 L40 14" fill="none" stroke="#3b3b58" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`),

  // Detaylı: belge + büyüteç
  detayli: svg(`
    <rect x="8" y="6" width="24" height="31" rx="4" fill="#dbeafe"/>
    <path d="M13 14h14M13 19h14M13 24h9" stroke="#60a5fa" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="31" cy="30" r="8.5" fill="#fff" stroke="#1e3a8a" stroke-width="3"/>
    <path d="M37.5 36.5 L43 42" stroke="#1e3a8a" stroke-width="3.6" stroke-linecap="round"/>`),

  // Adım adım: merdiven + bayrak
  adim_adim: svg(`
    <path d="M6 40h10v-8h9v-8h9v-8h8v24H6z" fill="#fde68a"/>
    <path d="M6 40h10v-8h9v-8h9v-8h8" fill="none" stroke="#b45309" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M38 16V5" stroke="#3b3b58" stroke-width="2.4" stroke-linecap="round"/><path d="M38 5l8 3.5-8 3.5z" fill="#ef4444"/>
    <circle cx="11" cy="34" r="2.6" fill="#3b3b58"/>`),

  // Format odaklı: tablo blokları
  format: svg(`
    <rect x="6" y="8" width="36" height="32" rx="6" fill="#fce7f3"/><rect x="11" y="13" width="26" height="6" rx="2" fill="#ec4899"/>
    <rect x="11" y="22" width="12" height="5" rx="2" fill="#f9a8d4"/><rect x="25" y="22" width="12" height="5" rx="2" fill="#f9a8d4"/>
    <rect x="11" y="30" width="12" height="5" rx="2" fill="#f9a8d4"/><rect x="25" y="30" width="12" height="5" rx="2" fill="#f9a8d4"/>`),

  // Önce soru: iki konuşma balonu
  soru: svg(`
    <path d="M6 10a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H17l-7 6v-6a5 5 0 0 1-4-5z" fill="#bbf7d0"/>
    <path d="M17 12.5a3 3 0 1 1 4.2 2.7c-.8.4-1.2 1-1.2 1.8v.6" fill="none" stroke="#15803d" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="20" cy="21" r="1.4" fill="#15803d"/>
    <path d="M42 24a5 5 0 0 0-5-5H22a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h11l6 5v-5a5 5 0 0 0 3-5z" fill="#fff" stroke="#22c55e" stroke-width="2.2"/>
    <circle cx="25" cy="28" r="1.8" fill="#22c55e"/><circle cx="30" cy="28" r="1.8" fill="#22c55e"/><circle cx="35" cy="28" r="1.8" fill="#22c55e"/>`),

  // Logo: küçük yıldızlı kalem
  logo: svg(`
    <path d="M10 38l4-12 18-18 8 8-18 18z" fill="#ffd166" stroke="#3b3b58" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M10 38l4-12 8 8z" fill="#ffe8b3" stroke="#3b3b58" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M28 12l8 8" stroke="#3b3b58" stroke-width="2.2"/>
    <path d="M38 30l1.6 3.6 3.6 1.6-3.6 1.6L38 40.4l-1.6-3.6-3.6-1.6 3.6-1.6z" fill="#8b5cf6"/>`),
};

/** Resmi bir kutunun içine koyar: <span class="sp-res sp-res-net">…svg…</span> */
export function resimKutusu(ad: keyof typeof RESIMLER, boyut = 46): HTMLSpanElement {
  const kutu = document.createElement('span');
  kutu.className = `sp-res sp-res-${ad}`;
  kutu.style.setProperty('--boyut', `${boyut}px`);
  kutu.innerHTML = RESIMLER[ad]; // sabit, güvenli SVG metni
  return kutu;
}
