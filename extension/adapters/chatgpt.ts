/**
 * ChatGPT ADAPTÖRÜ
 *
 * ChatGPT arayüzü değişip buton çalışmaz hale gelirse BAKILACAK İLK YER burası:
 * Tarayıcıda F12 → yazı kutusuna sağ tık → "İncele" ile yeni seçiciyi bulun ve
 * listenin başına ekleyin. Eskileri yedek olarak kalsın.
 */
import { editoreYaz, editoruOku, ilkEslesen, type SiteAdapter } from './types';

// Seçiciler öncelik sırasıyla (21.10.2026 itibarıyla ilki çalışıyor olmalı)
const SECICILER = [
  '#prompt-textarea[contenteditable="true"]', // ProseMirror editörü
  '#prompt-textarea', // eski textarea sürümü
  'form div[contenteditable="true"]', // id değişirse
  'form textarea', // son çare
];

export const chatgptAdapter: SiteAdapter = {
  site: 'chatgpt',
  kutuyuBul: () => ilkEslesen(SECICILER),
  metniOku: editoruOku,
  metniYaz: editoreYaz,
};
