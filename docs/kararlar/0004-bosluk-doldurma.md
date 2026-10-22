# 0004 - Köşeli parantezli boşlukların kullanıcıya doldurtulması

Tarih: 21.10.2026 · Durum: **kısmen uygulandı** — Katman 1 ✅, Katman 2 ✅ (22.10.2026, liste biçiminde), Katman 3 ⬜ · Öneren: Sena

## Sorun
Meta-prompt, bilinmeyen bilgileri uydurmamak için `[hedef kitle]`, `[programlama dili]` gibi boşluklar bırakıyor.
**Kullan**'a basınca bu boşluklar düz metin olarak yazı kutusuna giriyor ve kullanıcıyı uyaran hiçbir şey yok.
Hızlı kullanıcı köşeli parantezleri fark etmeden gönderebilir; o zaman yapay zekâ `[hedef kitle]` içeren bir
prompt'a cevap verir ve geliştirmenin faydası azalır.

## Değerlendirilen fikir: "gönderdikten sonra eksik bilgiyi sor"
Reddedildi, çünkü:
- Mesaj gitmiş olur; eklenti gönderilmiş mesajı değiştiremez. Yapay zekâ cevap vermeye başlamıştır.
- Kullanıcıdan alınan bilgiyle **yeni bir mesaj** gerekir → iki tur, iki cevap, kafa karışıklığı.
- Her sitenin "gönderildi" anını yakalamak kırılgandır.

→ Uyarı **göndermeden önce** verilmeli.

## Önerilen çözüm: üç katman

**Katman 1 — Kartta görünür kıl.** ✅ Uygulandı: `extension/lib/bosluklar.ts` (+ 5 test), `components/Panel.ts`, altın renk vurgu ve rozet. Kartlarda boşluklar renkli/vurgulu gösterilir; kart köşesinde
"✏️ 2 boşluk doldurulacak" rozeti olur. Öğretici: "iyi bir prompt'ta bu bilgiler olmalı".

**Katman 2 — Seçerken doldurt (asıl çözüm).** ✅ Uygulandı (Sena'nın önerisiyle **liste** biçiminde): her kartın altında "📝 Doldurman gerekenler (n)" listesi, her boşluk için bir yazma kutusu; yazdıkça önizlemede boşluk yeşile döner; Enter = Kullan; boş bırakılanlar [köşeli parantez] olarak kalır. Görsel: `docs/rapor/sekiller/arayuz-doldurma-listesi.png`. Aşağıdaki ilk tasarım (ayrı form) yerine bu seçildi: Boşluklu bir kartta **Kullan**'a basınca panel küçük bir forma döner:

```
┌─ Detaylı ────────────────────────────────────┐
│ Birkaç bilgi eksik; doldurursan cevap daha   │
│ iyi olur:                                    │
│   hedef kitle      [ üniversite öğrencileri ]│
│   programlama dili [ Python               ]  │
│                                              │
│ [Doldur ve kutuya yaz]  [Boşlukları bırak]   │
└──────────────────────────────────────────────┘
```
- Doldurulanlar metne yerleşir, sonra kutuya yazılır. Siteden bağımsız; gönder butonuna dokunmaz.
- **"Boşlukları bırak" şart:** "Önce soru" stratejisinde boşluklar bilerek bırakılır (yapay zekâ sorsun diye);
  bazen kullanıcı da yapay zekânın karar vermesini ister.

**Katman 3 — Göndermeden önce yumuşak uyarı (güvenlik ağı).** Kutuda hâlâ `[...]` varsa kutunun üstünde şerit:
"⚠️ 1 boşluk doldurulmadı: [hedef kitle]  [Göster]". **Gönderimi engellemez.** [Göster] ilk boşluğu kutuda seçer,
kullanıcı direkt üstüne yazar. Tarayıcı testinde adaptörler doğrulandıktan sonra yapılmalı.

## Araştırma katkısı
Anonim seçim kaydına (`POST /event`) iki sayı eklenir; **metin değil**:
- `bosluk_sayisi`: seçilen prompt'taki boşluk sayısı
- `doldurulan_bosluk`: kullanıcının doldurduğu boşluk sayısı

Raporda ölçülmüş bulgu: "kullanıcılar boşlukların %X'ini doldurdu; teknik olmayanlar daha az / çok doldurdu".
"Kullanıcı zamanla iyi prompt yazmayı öğreniyor mu?" iddiasına kanıt.

## Uygulama notları (yapacak kişi için)
| Dosya | Değişiklik |
|---|---|
| `extension/lib/bosluklar.ts` (yeni) | `bosluklariBul(metin)` → `["hedef kitle", …]`; `bosluklariDoldur(metin, degerler)`. Regex: `/\[([^\[\]]{1,40})\]/g`. Aynı boşluk birden çok geçerse hepsi doldurulur. Birim testi yazılmalı. |
| `extension/components/Panel.ts` | Katman 1: kartta vurgulu gösterim + rozet. Katman 2: Kullan → boşluk varsa form. |
| `extension/entrypoints/content/style.css` | Vurgu ve form stilleri (açık/koyu tema) |
| `server/app/schemas.py` + `extension/lib/schema.ts` | `SecimOlayi`'na `bosluk_sayisi`, `doldurulan_bosluk` (aynı PR'da ikisi birden!) |
| `eval/kullanici_calismasi.py` | Doldurma oranı tablosu |
| `docs/kullanici-calismasi/gorusme-rehberi.md` | Zaten soru var: "Köşeli parantezli boşluklar hakkında ne düşünüyorsunuz?" |

Ön koşul: Tarayıcı testinde **Kullan**'ın metni Gemini/ChatGPT kutusuna doğru yazdığı doğrulanmalı
(boşluk formu da aynı `editoreYaz` fonksiyonunu kullanacak).
