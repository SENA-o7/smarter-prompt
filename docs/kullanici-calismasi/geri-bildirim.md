# Gerçek kullanıcılardan geri bildirim: nasıl alınır, nerede toplanır, nasıl kullanılır?

## Dört kanal

| # | Kanal | Ne öğreniriz | Nerede toplanır | Kim bakar |
|---|---|---|---|---|
| 1 | **Eklenti içi 👍/👎 + not** (panelin altı) | Anlık memnuniyet, türe göre başarı, "ne eksikti" notları, tür düzeltme oranı | Sunucu: `server/veri/geri_bildirim.jsonl` | K3, haftalık |
| 2 | **Otomatik seçim kaydı** (onay verenlerde) | Hangi strateji seçiliyor, düzenleniyor mu, ne kadar sürede (AS3) | Sunucu: `server/veri/olaylar.jsonl` | K3 |
| 3 | **SUS anketi + açık uçlu sorular** (hafta sonunda) | Kullanılabilirlik puanı (AS5), genel görüş | Google Forms → ekip Drive'ı | K3 |
| 4 | **Görüşme** (3-4 kişi, 15 dk) | "Neden?" sorusunun cevabı, beklenmedik kullanımlar | Görüşme notları → ekip Drive'ı | Hepsi |
| + | **GitHub Issues** ("Geri bildirim" şablonu) | Hata ve özellik istekleri (teknik katılımcılar için) | GitHub → Issues | Hepsi |

1 ve 2 otomatik ve sürekli; 3 ve 4 hafta sonunda bir kez. Prompt metni hiçbir kanalda **otomatik olarak** kaydedilmez.

## Kanal 1: Eklenti içi geri bildirim nasıl çalışıyor?
1. Kullanıcı 5 seçeneği görür; panelin altında **"Bu öneriler işine yaradı mı? 👍 👎"**.
2. Birine basınca isteğe bağlı bir not kutusu açılır ("En çok neyi beğendin?" / "Ne eksikti?") + "Kişisel bilgi yazma" uyarısı.
3. **Gönder** → eklenti → `POST /geri-bildirim` → sunucu dosyaya bir satır ekler:
   ```json
   {"zaman": "2026-10-22T13:05:11+00:00", "oturum_id": "3f2a…", "site": "gemini", "puan": "kotu",
    "yorum": "görsel için ışık bilgisi istemedi", "gorev_turu": "gorsel", "tur_elle_degisti": false,
    "meta_prompt_surumu": "v2"}
   ```
4. Sunucu tarafında: not en fazla 500 karakter, fazladan alan (ör. yanlışlıkla `prompt`) gelirse **reddedilir**, IP kaydedilmez.

## Toplanan veriye nasıl bakılır?
```bash
server\.venv\Scripts\python eval\kullanici_calismasi.py --olaylar server\veri\olaylar.jsonl ^
    --geri-bildirim server\veri\geri_bildirim.jsonl --sus sus_yanitlari.csv
```
Çıktı: 👍 oranı (genel ve türe göre), algılanan türün düzeltilme oranı, okunacak notlar (👎 olanlar önce),
strateji seçim oranları, düzenlenme oranı, SUS puanı.

> ⚠️ Sunucu kullanıcıların bilgisayarında değil **bizim sunucumuzda** çalışmalı ki veriler tek yerde toplansın.
> Kullanıcı çalışmasından önce sunucuyu internete taşıyın (Render / Hugging Face Spaces) ve
> `extension/lib/config.ts` + `wxt.config.ts → host_permissions`'ı güncelleyin. `server/veri/` klasörü sunucuda
> kalıcı bir diskte olmalı (ücretsiz katmanlarda yeniden başlatınca silinebilir → her gün indirip Drive'a yedekleyin).

## Geri bildirimden geliştirmeye: haftalık döngü
```
Cuma: kullanici_calismasi.py çalıştır
  → 👎 notlarını oku, benzerlerini grupla (ör. "görselde ışık sormadı" × 4)
  → her grup için GitHub Issue aç (etiket: geri-bildirim) veya CLAUDE.md → "Fikirler" bölümüne ekle
  → ekipçe öncelik ver (en sık + en kolay önce)
  → meta-prompt / arayüz değişikliği → docs/kararlar/NNNN-*.md (gerekçe = geri bildirim sayıları)
  → değişiklikten sonraki hafta aynı metrik tekrar ölçülür (👍 oranı arttı mı?)
  → docs/gunluk/ → raporun 7.3 "Kullanıcı gözlemleri" bölümü
```

**Örnek:** "Görsel türünde 👍 oranı %55 (n = 20); 7 notun 4'ü 'ışık / kamera açısı sormadı'." →
meta-prompt v3'te görsel için ışık ve çekim açısı zorunlu → bir hafta sonra görselde 👍 %72 (n = 18).
(Sayılar örnektir; gerçek sonuçları yazın.)

## Gizlilik kuralları (onam formunda da yazıyor)
- Ham dosyalar (`server/veri/*.jsonl`, SUS yanıtları, görüşme notları) **GitHub'a girmez**; yalnızca ekip Drive'ı.
- Repoya yalnızca toplu, anonim özet: `data/user_study/ozet_anonim.csv`.
- Notlarda kişisel bilgi görülürse Drive'daki kopyadan silinir; rapora alıntılanacak notlar anonimleştirilir.
