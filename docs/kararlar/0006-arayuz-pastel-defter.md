# 0006 - Arayüz: "Pastel Defter" (yıldızlı temanın yerine)

Tarih: 22.10.2026 · Durum: **kabul edildi, uygulandı** · Karar veren: Sena

## Sorun
İlk görsel tasarım ("yıldızlı gece", karar yok, 22.10 sabahı) Sena'nın içine sinmedi. Kullanılabilirlik sorunları:
- 5 büyük kart alt alta → panel uzun, sürekli kaydırma; doldurma listeleri onu daha da uzatıyordu.
- Seçenekleri karşılaştırmak zor: hepsinin tam metni aynı anda açık.
- Tema sabit koyu; sitenin açık/koyu moduna uymuyordu.

## Değerlendirilen taslaklar
Görsel: [docs/rapor/sekiller/arayuz-taslaklar-abc.png](../rapor/sekiller/arayuz-taslaklar-abc.png). Üçünde de stratejilere
özel elle çizilmiş küçük SVG resimler (hedef tahtası, büyüteç, merdiven, tablo, konuşma balonları) var.

| Taslak | Düzen | Seçilmeme / seçilme nedeni |
|---|---|---|
| **A · Pastel Defter** ✅ | Akordeon: 5 seçenek tek satırlık özet, tıklanan açılır | Bir bakışta hepsi görünür, kaydırma çok az, sıcak ve sakin |
| B · Sade Sekmeli | Üstte 5 sekme, bir seferde biri büyük | Temiz ama seçenekleri yan yana göremiyorsun |
| C · Canlı Kartlar | Resimli karolar + seçilenin ayrıntısı | En göz alıcı ama en çok yer kaplayan |

## Uygulama
- `extension/components/resimler.ts`: 5 strateji + logo SVG'leri (sabit metin, Shadow DOM'a gömülü; ek dosya/izin yok).
- `extension/components/Panel.ts`: akordeon satırlar (aynı anda bir açık; ilki açık gelir), başlıkta tür seçici
  `💻 Kod ▾`, açık satırda tam prompt + doldurulacaklar + "neden" + **Bunu kullan →**, altta 👍/👎.
  Satır başlıkları `<button aria-expanded>` → klavye ve ekran okuyucu ile kullanılabilir.
- `extension/entrypoints/content/style.css`: krem kâğıt + turuncu kalem vurgusu; **sitenin koyu modunda sıcak kakao
  tonları** (`prefers-color-scheme: dark`); "hareketi azalt" ayarında animasyonlar kapalı.
- Ayarlar sayfası da aynı temaya geçti.

Görseller (gerçek `Panel` kodu sahte verilerle çalıştırılarak alındı):
[açık](../rapor/sekiller/arayuz-pastel-acik.png) · [koyu](../rapor/sekiller/arayuz-pastel-koyu.png)

## Rapor için gözlem
Tasarım bir kez değişti: "göz alıcı" ilk tema → kullanılabilirlik odaklı ikinci tema. Ölçmek için kullanıcı
çalışmasında SUS ve "seçim süresi" (`secim_suresi_ms`) kullanılabilir; eski tema kullanıcıya hiç sunulmadığı için
doğrudan karşılaştırma yok (kısıt olarak yazılmalı).
