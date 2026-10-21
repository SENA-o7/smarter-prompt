# Değerlendirme (K3)

## Otomatik değerlendirme (AS1, AS2, AS4) — 7. hafta
1. Test setindeki her prompt için sunucu 5 seçenek üretir.
2. Orijinal + 5 seçenek aynı **hedef** modele gönderilir (200 × 6 = 1.200 cevap).
3. **Hakem** model (geliştiriciden farklı aile) orijinalin cevabını her seçeneğin cevabıyla karşılaştırır.
4. Her karşılaştırma iki sırayla (A-B, B-A); iki sırada aynı karar çıkmazsa beraberlik.
5. 50 karşılaştırma ekipçe elle değerlendirilir; hakemle uyum oranı rapora yazılır.

| Metrik | Soru |
|---|---|
| Kazanma oranı (strateji × görev türü) | AS1, AS2 |
| Niyet korunması (1-5), uydurma oranı | AS4 |
| Şema geçerliliği (hedef ≥ %98), çeşitlilik (embedding benzerliği) | Teknik |
| Gecikme (medyan < 4 sn, p95), maliyet | Teknik |

İstatistik: binom (işaret) testi, ki-kare. Yüzdeler her zaman `n` ile verilir.

## Planlanan dosyalar
- `run_eval.py` — üretim + hedef model cevapları
- `judge.py` — sıra değiştirmeli hakem
- `notebooks/` — analiz ve rapor grafikleri
- `results/` — özet CSV'ler (ham çıktılar `results/ham/`, git'e girmez)
