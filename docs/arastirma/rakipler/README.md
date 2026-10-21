# Rakip analizi

Her araç aynı 10 test prompt'uyla denenir (`data/test_prompts/test_prompts_v0.jsonl` içindeki ilk 10).
Ekran görüntüleri bu klasöre: `<arac>-<prompt-id>.png`.

## Kontrol listesi (her araç için)
- Hangi sitelerde çalışıyor, buton nerede, kısayol var mı?
- Kaç seçenek veriyor, açıklama yapıyor mu, Türkçe prompt'u Türkçe mi geliştiriyor?
- Bilinmeyen bilgiyi uyduruyor mu, boşluk mu bırakıyor?
- Ne kadar sürüyor, ücretsiz kotası ne, veri nereye gidiyor?
- 10 prompt'taki en iyi ve en kötü örnek (ekran görüntüsüyle).

## Tablo

| Araç | Siteler | Seçenek sayısı | Açıklama | Türkçe | Uydurma / boşluk | Süre | Not |
|---|---|---|---|---|---|---|---|
| PromptJolt | ChatGPT, Claude, Gemini | 1 | | | | | Ctrl+M, 7 sn geri alma |
| Prompt Pro | + Perplexity | 1 | | | | | Rol + bağlam + format |
| PromptCraft (MIT) | 8 site | 1 (+kısa/detaylı) | | | boşluk bırakıyor | | En yakın örnek, kodu incelenecek |
| AIPRM | ChatGPT | şablon | | | | | Şablon yaklaşımı |
| PromptPerfect | — | — | — | — | — | — | 1 Eylül 2026'da kapandı |
