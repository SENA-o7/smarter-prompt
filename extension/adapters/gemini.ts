/**
 * GEMINI (gemini.google.com) ADAPTÖRÜ
 *
 * Gemini'nin yazı kutusu, <rich-textarea> bileşeninin içindeki bir Quill editörüdür
 * (`.ql-editor`, contenteditable). Quill de insertText komutunu doğru işler.
 */
import { editoreYaz, editoruOku, ilkEslesen, type SiteAdapter } from './types';

const SECICILER = [
  'rich-textarea .ql-editor[contenteditable="true"]', // ana editör
  'div.ql-editor[contenteditable="true"]', // bileşen adı değişirse
  'rich-textarea [contenteditable="true"]',
  'textarea', // son çare
];

export const geminiAdapter: SiteAdapter = {
  site: 'gemini',
  kutuyuBul: () => ilkEslesen(SECICILER),
  metniOku: editoruOku,
  metniYaz: editoreYaz,
};
