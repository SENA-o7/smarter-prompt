# 0005 - Görev türüne göre prompt (meta-prompt v2) ve tür etiketi

Tarih: 22.10.2026 · Durum: **kabul edildi, uygulandı** · Öneren: Sena

## Sorun
Eklenti farklı yapay zekâ araçlarında kullanılabilir: görsel üretimi, ses/müzik, metin, kod, matematik.
Her tür çok farklı bir iyi prompt ister (görselde stil, ışık, kompozisyon; seste tempo, süre, enstrüman;
matematikte adım adım çözüm ve doğrulama). v1 yalnızca 5 tür biliyordu ve ses/matematik yoktu.

## Değerlendirilen seçenekler
| Seçenek | Artı | Eksi |
|---|---|---|
| A. Her seferinde "Ne için kullanacaksın?" diye sor | Tür kesin doğru | Her geliştirmeye bir adım ekler; kısa prompt yazan kullanıcıyı yavaşlatır, projenin "uğraştırmadan" fikrine ters |
| B. Türü ayarlardan bir kez seç | Basit | Kullanıcı aynı gün hem kod hem görsel ister; ayar unutulur |
| **C. Otomatik algıla + panelde tek tıkla düzelt** ✅ | Sıfır ek adım; yanlışsa 1 tık | Algılama yanılabilir → ölçülmeli |

Seçilen: **C**. Gerçek testte model 10/10 türü doğru bulmuştu (v0/v1, `eval/results/`).

## Uygulama
- **Meta-prompt v2** (`server/app/meta_prompt.py`, `META_PROMPT_SURUMU=v2`): yeni türler `ses`, `matematik`; her tür için
  "iyi prompt'ta olması gerekenler" ve stratejilerin o türdeki karşılığı (ör. görselde "adım adım" = sahneyi katman katman tarif).
- **Şema** (iki taraf birlikte): `GorevTuru`'na `ses`, `matematik`; `EnhanceRequest.gorev_turu` (isteğe bağlı, kullanıcı seçtiyse).
- **Panel**: sonuçların üstünde `Algılanan tür: 🎨 Görsel ▾`. Değiştirilince seçenekler o türe göre yeniden üretilir;
  sunucu modele "KULLANICI GÖREV TÜRÜNÜ SEÇTİ" notu ekler ve cevapta kullanıcının seçimini korur.
- **Ölçüm**: geri bildirimde `tur_elle_degisti` → "kullanıcılar algılanan türü ne sıklıkla düzeltmek zorunda kaldı?"
- **Test seti v1.1** (`data/test_prompts/test_prompts_v1_1.jsonl`, 120 prompt): +10 ses, +10 matematik.

## İlk gerçek test (gemini-3.5-flash-lite, v2, 4 prompt)
| Prompt | Algılanan tür | Süre | Gözlem |
|---|---|---|---|
| bir kedi resmi çiz | gorsel ✅ | 8.1 sn | stil, arka plan, renk paleti, en-boy oranı; "adım adım" katman katman |
| doğum günü için şarkı yap | ses ✅ | 4.5 sn | müzik türü, tempo, enstrümanlar, süre |
| x kare artı 3x eksi 4 sıfıra eşit çöz | matematik ✅ | 4.5 sn | denklemi `x^2 + 3x - 4 = 0` biçimine çevirdi; diskriminant, doğrulama, numaralı adımlar |
| bana bir bahar sabahı anlat (kullanıcı: **ses**) | ses ✅ | 4.9 sn | 5 seçeneğin hepsi müzik/seslendirme prompt'una döndü |

**Kalan kusur:** görselde "Önce soru" seçeneği yine yapay zekânın ağzından yazıldı ("Bir kedi resmi çizmemi istiyorsun…").
v1'deki kural her türde tutmuyor → v3'te "soru" için türe özel örnek cümle eklenmeli; hakem değerlendirmesinde (judge.py) izlenmeli.

## Açık sorular
- Tür algılama doğruluğu 120 prompt'ta ölçülmeli: `python eval/meta_prompt_testi.py --set data/test_prompts/test_prompts_v1_1.jsonl --limit 120`
  (görev türü uyumu sütunu). Ücretsiz kota nedeniyle birkaç güne bölün.
- Video türü gerekir mi? Şimdilik `gorsel` altında; kullanıcı geri bildirimlerine göre karar verilecek.
