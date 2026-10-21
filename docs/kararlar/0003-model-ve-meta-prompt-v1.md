# 0003 - Model değişikliği (gemini-3.5-flash-lite) ve meta-prompt v1

Tarih: 21.10.2026 · Durum: kabul edildi

## Bağlam: ilk gerçek API testi
| Gözlem | Kanıt |
|---|---|
| `gemini-2.5-flash` ilk çağrı 37 sn, sonraki ~10 sn | Elle çağrı, `eval/meta_prompt_testi.py` |
| Ücretsiz katman: dakikada 5, **günde 20** istek → toplu testte 20 isteğin 19'u reddedildi | Google hatası: `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, değer 20 |
| Google tarafında ara sıra "model şu an yoğun" (503) | Sunucu kaydı: ~20 istekte 3 kez |
| `gemini-2.5-flash`, "soru" stratejisinde yapay zekânın cevabını yazdı: "Elbette, size kod yazabilirim. Ancak…" | İlk gerçek çıktı |

## Kararlar
1. **Model:** `gemini/gemini-3.5-flash-lite` (ayrı kota, daha hızlı). `.env` → `MODEL`.
2. **Düşünme kapalı:** `DUSUNME=disable` → LiteLLM `reasoning_effort`.
3. **Dayanıklılık:** sağlayıcı 429 → kullanıcıya 429 ("kota doldu"); geçici hata → 1.5 sn sonra bir kez daha dene.
4. **Meta-prompt v1** (`server/app/meta_prompt.py`, `META_PROMPT_SURUMU=v1`):
   - Tüm prompt'lar kullanıcının ağzından yazılır; asla yapay zekânın cevabı gibi değil.
   - Görev türüne göre tipik eksik bilgiler (kod: dil, girdi/çıktı…; yazı: hedef kitle, ton…).
   - "soru" stratejisi açıkça: "cevap vermeden önce eksikleri sor".
   - "neden": neyin eklendiğini anlatan tek cümle, en fazla 25 kelime.
   - v0 silinmedi; `.env`'den seçilerek karşılaştırılabilir.

## Sonuçlar: v0 ve v1 karşılaştırması (`gemini-3.5-flash-lite`, v0 setinin ilk 10 prompt'u)
| Metrik | Hedef | v0 (15:19) | v1 (15:24) |
|---|---|---|---|
| Şema geçerliliği | ≥ %98 | %100 (10/10) | %100 (10/10) |
| Görev türü uyumu | — | %100 (10/10) | %100 (10/10) |
| Medyan süre | < 4 sn | 5.3 sn | 13.9 sn |
| Seçenek başına prompt uzunluğu | — | 25.4 kelime | 20.8 kelime |
| "neden" uzunluğu | ≤ 25 kelime (v1) | ort. 12.0, en çok 17 | ort. 12.5, en çok 17 |

**v1 daha mı yavaş? Hayır.** Aynı prompt'la art arda (v0, v1, v0, v1) yapılan kontrol denemesinde süreler
13.2 / 9.6 / 12.5 / 13.5 sn çıktı: sürümler arasında fark yok. 15:19'da 5 sn süren istekler 15:30'da 12-13 sn
sürüyordu. **Süreyi belirleyen, Google'ın o anki yükü.** Ücretsiz katmanda gecikme 4-21 sn arasında oynuyor.

Çıkarımlar (rapor 7.1 için):
- Sürüm karşılaştırmaları farklı zamanlarda değil, **art arda / karışık sırayla** yapılmalı.
- "Medyan < 4 sn" hedefi ücretsiz katmanda güvenilir şekilde ölçülemez; ücretli katman veya yerel model gerekir.
- v1, v0'a göre daha kısa ve net prompt'lar üretiyor (25.4 → 20.8 kelime); "soru" stratejisi artık doğru
  biçimde kullanıcının ağzından ("…kod yazmak istiyorum. Başlamadan önce bana eksikleri sor.").
- Kalite farkı için n = 10 yetersiz → `eval/judge.py` ile hakem değerlendirmesi gerekli.

Not: n = 10 küçük bir örneklemdir; kesin karşılaştırma için 100 prompt ve hakem değerlendirmesi (`eval/judge.py`) gerekir.
