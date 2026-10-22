/**
 * SUNUCU İLE SÖZLEŞME (Zod şeması)
 *
 * server/app/schemas.py'nin TypeScript karşılığı. İki dosya AYNI PR'da birlikte güncellenir.
 * Zod, sunucudan gelen JSON'u çalışma anında kontrol eder; beklenmeyen bir cevap gelirse
 * panel bozulmak yerine anlaşılır bir hata gösterilir.
 */
import { z } from 'zod';

export const STRATEJILER = ['net', 'detayli', 'adim_adim', 'format', 'soru'] as const;
// ses ve matematik meta-prompt v2 ile eklendi (server/app/schemas.py ile aynı olmalı)
export const GOREV_TURLERI = ['kod', 'yazi', 'analiz', 'gorsel', 'ses', 'matematik', 'diger'] as const;

/** Tek bir seçenek kartı */
export const SecenekSchema = z.object({
  strateji: z.enum(STRATEJILER),
  baslik: z.string().min(1),
  prompt: z.string().min(1),
  neden: z.string().min(1),
});

/** Modelin ürettiği çıktı (yerel modda Gemini Nano'nun cevabı da buna uymalı) */
export const GelistirmeSonucuSchema = z.object({
  gorev_turu: z.enum(GOREV_TURLERI),
  eksik_bilgiler: z.array(z.string()),
  secenekler: z
    .array(SecenekSchema)
    .length(5)
    .refine((s) => new Set(s.map((x) => x.strateji)).size === 5, '5 stratejinin her biri bir kez olmalı'),
});

/** POST /enhance cevabı = model çıktısı + ölçüm bilgileri */
export const EnhanceResponseSchema = GelistirmeSonucuSchema.extend({
  model: z.string(),
  meta_prompt_surumu: z.string(),
  sure_ms: z.number(),
});

// Şemalardan TypeScript tiplerini otomatik türet (tipleri iki kez yazmamak için)
export type Secenek = z.infer<typeof SecenekSchema>;
export type GorevTuru = (typeof GOREV_TURLERI)[number];
export type EnhanceResponse = z.infer<typeof EnhanceResponseSchema>;

export type Site = 'chatgpt' | 'claude' | 'gemini' | 'diger';

/**
 * POST /event gövdesi: anonim seçim kaydı (kullanıcı çalışması, AS3).
 * Bilerek prompt metni İÇERMEZ.
 */
export type SecimOlayi = {
  oturum_id: string;
  site: Site;
  strateji: Secenek['strateji'];
  gorev_turu: GorevTuru;
  duzenlendi: boolean; // kullanıcı seçtiği prompt'u göndermeden önce değiştirdi mi?
  secim_suresi_ms: number; // panel açıldıktan sonra kaç ms'de seçti
  meta_prompt_surumu: string;
};

// --- İçerik betiği ↔ arka plan betiği mesajları ---
/** gorev_turu: kullanıcı paneldeki tür etiketinden türü elle seçtiyse; yoksa model kendisi algılar. */
export type GelistirIstegi = { tur: 'gelistir'; prompt: string; site: Site; gorev_turu?: GorevTuru };
export type GelistirCevabi = { ok: true; veri: EnhanceResponse } | { ok: false; hata: string };
export type OlayMesaji = { tur: 'olay'; olay: Omit<SecimOlayi, 'oturum_id'> };

/** POST /geri-bildirim gövdesi: paneldeki 👍/👎 + isteğe bağlı kısa not (prompt metni YOK). */
export type GeriBildirim = {
  oturum_id: string;
  site: Site;
  puan: 'iyi' | 'kotu';
  yorum: string; // en fazla 500 karakter
  gorev_turu: GorevTuru;
  tur_elle_degisti: boolean;
  meta_prompt_surumu: string;
};
export type GeriBildirimMesaji = { tur: 'geri_bildirim'; gb: Omit<GeriBildirim, 'oturum_id'> };
