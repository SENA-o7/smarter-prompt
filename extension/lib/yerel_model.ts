/**
 * ÇEVRİMDIŞI MOD: Chrome'un yerleşik Gemini Nano modeli (Prompt API) — DENEYSEL
 *
 * Avantajı: Prompt bilgisayardan hiç çıkmaz, sunucu ve API anahtarı gerekmez.
 * Sınırları (rapora yazılacak):
 *  - Güçlü donanım ve birkaç GB'lık model indirmesi gerekir; her bilgisayarda yoktur.
 *  - Nano küçük bir modeldir; Türkçe kalitesi ve JSON tutarlılığı bulut modelinden düşük olabilir.
 *    Bunu test setiyle ölçmek gerekiyor (eval/).
 *  - Kullanılamazsa arka plan betiği otomatik olarak buluta geri döner.
 *
 * Belge: https://developer.chrome.com/docs/ai/prompt-api
 */
import { YEREL_META_PROMPT, YEREL_META_PROMPT_SURUMU } from './meta_prompt';
import { GelistirmeSonucuSchema, type GelistirCevabi } from './schema';

// Prompt API'nin tipleri henüz TypeScript'in standart kütüphanesinde yok; kullandığımız kadarını tanımlıyoruz.
type LanguageModelOturumu = {
  prompt(girdi: string, secenekler?: { responseConstraint?: object }): Promise<string>;
  destroy(): void;
};
type LanguageModelApi = {
  availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(secenekler: { initialPrompts: { role: 'system'; content: string }[] }): Promise<LanguageModelOturumu>;
};

/** Modelin çıktısını bu JSON şemasına zorlamak için (responseConstraint). */
const JSON_SEMASI = {
  type: 'object',
  required: ['gorev_turu', 'eksik_bilgiler', 'secenekler'],
  properties: {
    gorev_turu: { enum: ['kod', 'yazi', 'analiz', 'gorsel', 'diger'] },
    eksik_bilgiler: { type: 'array', items: { type: 'string' } },
    secenekler: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        required: ['strateji', 'baslik', 'prompt', 'neden'],
        properties: {
          strateji: { enum: ['net', 'detayli', 'adim_adim', 'format', 'soru'] },
          baslik: { type: 'string' },
          prompt: { type: 'string' },
          neden: { type: 'string' },
        },
      },
    },
  },
};

export async function yerelModelDurumu(): Promise<string> {
  const api = (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;
  if (!api) return 'yok';
  return api.availability();
}

export async function yerelGelistir(prompt: string): Promise<GelistirCevabi> {
  const api = (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;
  if (!api || (await api.availability()) !== 'available') {
    return { ok: false, hata: 'Yerel model bu tarayıcıda kullanılamıyor.' };
  }
  const baslangic = performance.now();
  const oturum = await api.create({ initialPrompts: [{ role: 'system', content: YEREL_META_PROMPT }] });
  try {
    const metin = await oturum.prompt(`Kullanıcının prompt'u:\n<<<\n${prompt}\n>>>`, {
      responseConstraint: JSON_SEMASI,
    });
    const sonuc = GelistirmeSonucuSchema.safeParse(JSON.parse(metin));
    if (!sonuc.success) return { ok: false, hata: 'Yerel model geçerli bir cevap üretemedi.' };
    return {
      ok: true,
      veri: {
        ...sonuc.data,
        model: 'yerel/gemini-nano',
        meta_prompt_surumu: YEREL_META_PROMPT_SURUMU,
        sure_ms: Math.round(performance.now() - baslangic),
      },
    };
  } catch {
    return { ok: false, hata: 'Yerel model hata verdi.' };
  } finally {
    oturum.destroy();
  }
}
