/**
 * CLAUDE (claude.ai) ADAPTÖRÜ
 *
 * Claude'un yazı kutusu bir ProseMirror editörüdür (contenteditable div). Yazma işi
 * ChatGPT'deki gibi `editoreYaz` ile (insertText) yapılır.
 * Arayüz değişirse: F12 → yazı kutusuna sağ tık → İncele → yeni seçiciyi listenin başına ekle.
 */
import { editoreYaz, editoruOku, ilkEslesen, type SiteAdapter } from './types';

const SECICILER = [
  'div.ProseMirror[contenteditable="true"]', // ana editör
  'fieldset div[contenteditable="true"]', // sınıf adı değişirse
  'div[contenteditable="true"][aria-label]', // erişilebilirlik etiketiyle
  'textarea', // son çare
];

export const claudeAdapter: SiteAdapter = {
  site: 'claude',
  kutuyuBul: () => ilkEslesen(SECICILER),
  metniOku: editoruOku,
  metniYaz: editoreYaz,
};
