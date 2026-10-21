/**
 * SUNUCU İLE SÖZLEŞME (Zod şeması)
 *
 * server/app/schemas.py'nin TypeScript karşılığı. İki dosya AYNI PR'da birlikte güncellenir.
 * Zod, sunucudan gelen JSON'u çalışma anında kontrol eder; beklenmeyen bir cevap gelirse
 * panel bozulmak yerine anlaşılır bir hata gösterilir.
 */
import { z } from 'zod';

export const STRATEJILER = ['net', 'detayli', 'adim_adim', 'format', 'soru'] as const;

/** Tek bir seçenek kartı */
export const SecenekSchema = z.object({
  strateji: z.enum(STRATEJILER),
  baslik: z.string().min(1),
  prompt: z.string().min(1),
  neden: z.string().min(1),
});

/** POST /enhance cevabı */
export const EnhanceResponseSchema = z.object({
  gorev_turu: z.enum(['kod', 'yazi', 'analiz', 'gorsel', 'diger']),
  eksik_bilgiler: z.array(z.string()),
  secenekler: z.array(SecenekSchema).length(5),
  model: z.string(),
  meta_prompt_surumu: z.string(),
  sure_ms: z.number(),
});

// Şemalardan TypeScript tiplerini otomatik türet (tipleri iki kez yazmamak için)
export type Secenek = z.infer<typeof SecenekSchema>;
export type EnhanceResponse = z.infer<typeof EnhanceResponseSchema>;

export type Site = 'chatgpt' | 'claude' | 'gemini' | 'diger';

// --- İçerik betiği ↔ arka plan betiği mesajları ---
export type GelistirIstegi = { tur: 'gelistir'; prompt: string; site: Site };
export type GelistirCevabi = { ok: true; veri: EnhanceResponse } | { ok: false; hata: string };
