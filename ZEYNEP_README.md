# ZEYNEP README — Hafta 5-9: ne yapıldı, nasıl çalışıyor, sırada ne var?

Hafta 1-4'ün anlatımı için: [SENA_README.md](SENA_README.md). Güncel durum ve yapılacaklar listesi
için her zaman önce: [CLAUDE.md](CLAUDE.md) → "Durum / Nerede kaldık".

> **Kısa özet:** 5-9. haftaların **kod tarafı** yazıldı ve otomatik testlerden geçiyor. Kalan işler
> çoğunlukla **insan işi**: tarayıcıda deneme, kullanıcı çalışmasını yürütmek, sonuçları yorumlamak.
> Aşağıda her parçanın ne olduğu, nasıl denendiği ve neyin hâlâ denenmediği dürüstçe yazıyor.

---

## İçindekiler
1. [Hafta 5-6: Genişletme (3 site, ayarlar, meta-prompt)](#hafta-5-6-genişletme)
2. [Hafta 7: Otomatik değerlendirme ve seçim kaydı](#hafta-7-otomatik-değerlendirme)
3. [Hafta 8: Kullanıcı çalışması](#hafta-8-kullanıcı-çalışması)
4. [Hafta 9: Analiz, çevrimdışı mod](#hafta-9-analiz-ve-iyileştirme)
5. [Gerçek Gemini testinden öğrendiklerimiz](#gerçek-gemini-testinden-öğrendiklerimiz)
6. [Ne test edildi, ne edilmedi?](#ne-test-edildi-ne-edilmedi)
7. [Senin / ekibin yapması gerekenler](#ekibin-yapması-gerekenler)

---

## Hafta 5-6: Genişletme

### Claude ve Gemini desteği
Eklenti artık **ChatGPT, Claude ve Gemini**'de çalışacak şekilde derleniyor.

| Dosya | Ne yapar |
|---|---|
| `extension/adapters/claude.ts` | claude.ai yazı kutusu (ProseMirror editörü) seçicileri |
| `extension/adapters/gemini.ts` | gemini.google.com yazı kutusu (`rich-textarea` içindeki Quill editörü) seçicileri |
| `extension/adapters/index.ts` | Sayfa adresine göre doğru adaptörü seçer; içerik betiğinin hangi sitelerde çalışacağı da buradan gelir |
| `extension/tests/adapters.test.ts` | Doğru adaptör seçiliyor mu testi |

**Yeni site eklemek** artık 3 adım: adaptör dosyası yaz → `adapters/index.ts`'e ekle → teste ekle.

> ⚠️ Seçiciler sitelerin bugünkü yapısına göre yazıldı ama **tarayıcıda denenmedi**. Buton çıkmıyorsa
> ya da "Kullan" metni kutuya yazmıyorsa: F12 → yazı kutusuna sağ tık → **İncele** → doğru seçiciyi bulup
> ilgili adaptör dosyasındaki `SECICILER` listesinin **başına** ekle.

### Panel ortak bileşen oldu
`extension/components/Panel.ts`: Buton + 5 kart + Kullan / Geri al. Siteden bağımsız; yazı kutusuyla
yalnızca adaptör üzerinden konuşur. Yeni: **Esc ile kapanma**, ekran okuyucu desteği (`aria-*`).

### Ayarlar sayfası
Eklenti simgesine sağ tık → **Seçenekler**. (`extension/entrypoints/options/`, ayarlar: `extension/lib/ayarlar.ts`)

| Ayar | Seçenekler | Varsayılan |
|---|---|---|
| Dil | otomatik / her zaman Türkçe / her zaman İngilizce | otomatik |
| Çalışma modu | **bulut** (sunucu) / **yerel** (Gemini Nano, deneysel) | bulut |
| Araştırmaya katılım | anonim seçim kaydı aç / kapat | **kapalı** |

### Meta-prompt ve model
- **Model değişti:** `gemini-2.5-flash` → **`gemini-3.5-flash-lite`** (nedeni aşağıda, gerçek test bölümünde).
  Model `server/.env`'deki `MODEL=` satırından değişir; kod değişmez.
- **Düşünme kapatıldı:** `DUSUNME=disable` (`server/app/config.py`). Prompt yeniden yazmak için
  modelin uzun uzun "düşünmesine" gerek yok; süreyi ciddi kısaltır.

---

## Hafta 7: Otomatik değerlendirme

### Anonim seçim kaydı (`POST /event`)
Kullanıcı çalışması için: kim hangi stratejiyi seçti, göndermeden önce düzenledi mi?

```
Kullanıcı "Kullan"a basar → Panel yazı kutusunu izler → kutu boşalınca (= mesaj gönderildi)
son metin seçilen metinle aynı mı? → evet/hayır → arka plan betiği → (onay varsa) POST /event
→ sunucu: server/veri/olaylar.jsonl dosyasına bir satır
```

Gönderilen kayıt örneği (**prompt metni yok**):
```json
{"oturum_id": "3f2a…", "site": "chatgpt", "strateji": "detayli", "gorev_turu": "kod",
 "duzenlendi": false, "secim_suresi_ms": 4200, "meta_prompt_surumu": "v0"}
```

Gizlilik güvenceleri (hepsi testli):
- Onay kutusu kapalıysa eklenti **hiçbir şey göndermez**.
- Sunucu şeması `extra="forbid"`: kayıtta fazladan bir alan (ör. yanlışlıkla `prompt`) varsa **reddedilir, diske yazılmaz**.
- IP adresi kaydedilmez. `server/veri/` klasörü `.gitignore`'da, GitHub'a gitmez.

### LLM hakem değerlendirmesi — `eval/judge.py`
"Geliştirilmiş prompt daha iyi cevap getiriyor mu?" (AS1, AS2, AS4)

1. Her test prompt'u için sunucudan 5 seçenek alınır.
2. Orijinal + 5 seçenek aynı **hedef** modele sorulur.
3. **Hakem** model orijinalin cevabını her seçeneğin cevabıyla **iki sırayla** (A-B, B-A) karşılaştırır.
   İki sırada aynı sonuç çıkmazsa "berabere" sayılır (sıra yanlılığına karşı).
4. Hakem ayrıca **niyet korunması (1-5)** ve **uydurma var mı** sorularını puanlar.

```bash
server\.venv\Scripts\pip install -r eval\requirements.txt
server\.venv\Scripts\python eval\judge.py --limit 10 --hedef gemini/gemini-3.5-flash-lite --hakem openai/gpt-4o-mini
```

> ⚠️ **Hakem farklı bir model ailesinden olmalı** (ör. OpenAI). Elimizde şu an yalnızca Gemini anahtarı var.
> Gemini ile hakem yaparsanız betik uyarı verir; raporda "kendini kayırma yanlılığı olabilir" diye kısıt yazın.
>
> ⚠️ **Kota:** Prompt başına ~22 model çağrısı. Ücretsiz Gemini kotasıyla 200 prompt günlerce sürer.
> Önce `--limit 10`. Betik her çağrıyı önbelleğe yazar; yarıda kesilirse kaldığı yerden devam eder.

### Sunucu dayanıklılığı
| Durum | Eskiden | Şimdi |
|---|---|---|
| Model "şu an yoğun" (Google 503) | Kullanıcıya hata | 1.5 sn bekleyip **bir kez daha dener** |
| Ücretsiz kota doldu | "Model yanıt vermiyor" (503, yanıltıcı) | **429**: "Model kotası doldu, bir dakika bekleyin" |

---

## Hafta 8: Kullanıcı çalışması

Bütün materyaller hazır: [`docs/kullanici-calismasi/`](docs/kullanici-calismasi/)

| Dosya | İçerik |
|---|---|
| `README.md` | Çalışmanın adım adım planı ve bilinen kısıtlar |
| `onam-formu.md` | Bilgilendirilmiş onam formu (KVKK, gönüllülük, çekilme hakkı) |
| `kurulum-talimati.md` | Katılımcıya gönderilecek kurulum adımları |
| `gorevler.md` | 1. gün 5 standart görev + gözlemci kontrol listesi |
| `sus-anketi.md` | 10 SUS sorusu + açık uçlu sorular (Google Forms'a aktarılacak) |
| `gorusme-rehberi.md` | 15 dakikalık görüşme soruları ve not şablonu |

> ⚠️ Başlamadan önce **hocaya danışın** (etik kurul onayı gerekebilir).
>
> ⚠️ Katılımcıların sunucuya erişebilmesi için sunucunun internete taşınması gerekir (Render / HF Spaces),
> ya da çalışma yüz yüze, sizin bilgisayarınızda yapılır.

---

## Hafta 9: Analiz ve iyileştirme

### `eval/analiz.py` — hakem sonuçlarının istatistiği
```bash
server\.venv\Scripts\python eval\analiz.py eval\results\judge_<tarih>.csv
```
- **AS1:** Genel kazanma oranı + işaret (binom) testi → "anlamlı mı?"
- **AS2:** Strateji × görev türü kazanma tablosu + ki-kare testi
- **AS4:** Strateji başına niyet ortalaması ve uydurma oranı
- Grafikler otomatik: `docs/rapor/sekiller/kazanma_strateji.png`, `strateji_gorev_isi.png`

### `eval/kullanici_calismasi.py` — seçim kayıtları ve SUS
```bash
server\.venv\Scripts\python eval\kullanici_calismasi.py --olaylar server\veri\olaylar.jsonl --sus sus_yanitlari.csv
```
- **AS3:** Hangi strateji ne sıklıkla seçildi, görev türüne göre dağılım, düzenlenme oranı, seçim süresi
- **AS5:** SUS puanı (0-100, standart hesap), teknik / teknik olmayan karşılaştırması
- Repoya yalnızca toplu özet yazar: `data/user_study/ozet_anonim.csv`

### Çevrimdışı mod: Gemini Nano (deneysel)
`extension/lib/yerel_model.ts`. Ayarlardan **Yerel** seçilirse Chrome'un kendi içindeki küçük model
kullanılır; prompt bilgisayardan çıkmaz. Model yoksa veya hata verirse **otomatik olarak buluta döner**.
Ayarlar sayfası yerel modelin durumunu gösterir (hazır / indirilebilir / desteklenmiyor).

> ⚠️ Hiç denenmedi. Chrome 138+ ve güçlü bir bilgisayar gerekir; Nano'nun Türkçe kalitesi düşük olabilir.
> Rapora "deneysel özellik" olarak yazın.

---

## Gerçek Gemini testinden öğrendiklerimiz

21.10.2026'da gerçek API anahtarıyla yapılan denemeler. Bunlar raporun **"7.1 Model davranışına dair
gözlemler"** bölümü için hazır malzeme:

| # | Gözlem | Kanıt | Karar |
|---|---|---|---|
| 1 | `gemini-2.5-flash` ilk istekte **37 sn** sürdü | `eval/meta_prompt_testi.py` + elle çağrı | "Düşünme"yi kapattık (`DUSUNME=disable`) |
| 2 | Ücretsiz katman: **dakikada 5, günde 20 istek** (2.5-flash). İlk toplu testte 20 isteğin 19'u reddedildi (%5 "başarı") | Google hata mesajı: `GenerateRequestsPerDayPerProjectPerModel-FreeTier: 20` | Ölçüm betiğine bekleme eklendi; sunucu kota dolunca doğru hatayı (429) veriyor |
| 3 | Google tarafında ara sıra **"model şu an yoğun" (503)** | Sunucu kaydı: 20 istekte 3 kez | Sunucu artık bir kez daha deniyor |
| 4 | `gemini-2.5-flash` "Önce soru" seçeneğini **kullanıcının prompt'u yerine yapay zekânın cevabı gibi** yazdı ("Elbette, size kod yazabilirim. Ancak…") | İlk gerçek çağrının çıktısı | `gemini-3.5-flash-lite`'ta bu hata görülmedi; meta-prompt'a açık kural eklenecek |
| 5 | `gemini-3.5-flash-lite`: 2. istekte **4.4 sn**, uydurma yok, boşluklar doğru (`[ders]`, `[hoca adı]`) | Elle çağrı, 2 prompt | Varsayılan model yapıldı |
| 7 | Gecikme saatten saate 2-3 kat değişiyor (aynı prompt: 15:19'da ~5 sn, 15:30'da ~13 sn) | v0/v1 art arda kontrol denemesi | Sürümler art arda karşılaştırılmalı |
| 6 | Bazı model adları artık yok (`gemini-2.0-flash` → 404) | API model listesi | Model adı `.env`'de; değiştirmek kolay |

### Canlı ölçüm: meta-prompt v0 ve v1 (`gemini-3.5-flash-lite`, 10 prompt)

CSV'ler: `eval/results/meta_prompt_v0_20261021-1519.csv`, `meta_prompt_v1_20261021-1524.csv`

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

---

## Ne test edildi, ne edilmedi?

| Parça | Durum |
|---|---|
| Sunucu (`/enhance`, `/event`, `/geri-bildirim`, v2 türleri, kota, yeniden deneme, gizlilik) | ✅ **19 otomatik test** + gerçek Gemini ile çalıştırıldı |
| Eklenti (şema, adaptör seçimi, boşluklar, performans, sunucu adresi) | ✅ **20 otomatik test**, tip kontrolü, derleme (manifest'te 3 site + ayarlar + kısayol) |
| Analiz betikleri (`analiz.py`, `kullanici_calismasi.py`) | ✅ Sahte verilerle uçtan uca çalıştırıldı (tablolar + grafikler) |
| Docker imajı (`docker compose`) | ✅ Derlendi ve gerçek Gemini ile çalıştırıldı |
| `judge.py` | ⚠️ Sözdizimi ve lint kontrolü; **gerçek modelle çalıştırılmadı** (hakem için ikinci bir sağlayıcı anahtarı yok) |
| Eklentinin ChatGPT / Claude / Gemini sitelerinde çalışması | ❌ **Tarayıcıda denenmedi** |
| Ayarlar sayfası, seçim kaydı, düzenlendi tespiti | ❌ Tarayıcıda denenmedi |
| Gemini Nano yerel mod | ❌ Denenmedi |

---

## Ekibin yapması gerekenler

**Hemen:**
1. **Tarayıcı testi** (en önemli): `cd extension && npm install && npm run dev` → açılan Chrome'da sırayla
   chatgpt.com, claude.ai, gemini.google.com → Geliştir → Kullan → Gönder. Çalışmayan sitenin
   adaptöründeki seçiciyi düzelt. Ekran görüntülerini `docs/arastirma/` altına koy.
2. **Ayarlar sayfası:** Eklenti simgesine sağ tık → Seçenekler → her ayarı değiştir, sayfayı yenile, kalıcı mı?
3. **Seçim kaydı:** Ayarlardan onayı aç → bir seçenek kullan → gönder → `server/veri/olaylar.jsonl`'de satır oluştu mu,
   `duzenlendi` doğru mu? Onayı kapat → kayıt oluşmuyor mu?

**Bu hafta:**
4. Hakem için **farklı aileden bir model anahtarı** (ör. OpenAI) → `server/.env`'e `OPENAI_API_KEY=` → `judge.py --limit 10`.
5. Test setini **200'e** çıkar: `scripts/data/` betikleriyle WildChat'ten Türkçe prompt'lar → `test_prompts_v2.jsonl`.
6. Meta-prompt v1: "Önce soru" stratejisi için "prompt'u kullanıcının ağzından yaz" kuralı + görev türüne göre
   ipuçları → `META_PROMPT_SURUMU = "v1"` → `docs/kararlar/0003-meta-prompt-v1.md` → v0 ile karşılaştır.

7. **Boşluk doldurma özelliği** (tarayıcı testinden sonra): aşağıdaki "Eklenecekler" bölümü ve karar 0004.

**8. hafta:**
8. Hocaya danış → katılımcı listesi → sunucuyu internete taşı → `docs/kullanici-calismasi/README.md`'deki adımlar.

**Her cuma:** `docs/gunluk/hafta-NN-isim.md` (şablon: `docs/gunluk/_sablon.md`) — raporun 7. bölümü buradan çıkacak.

---

## Arayüz: "Pastel Defter" (22.10.2026 öğleden sonra) — güncel

Sena yıldızlı temayı beğenmedi; üç taslak hazırlandı (A/B/C), **A · Pastel Defter** seçildi
(karar: [docs/kararlar/0006-arayuz-pastel-defter.md](docs/kararlar/0006-arayuz-pastel-defter.md)).

| Öğe | Ne yapıyor |
|---|---|
| **Geliştir butonu** | Turuncu, üstünde küçük kalem resmi; çalışırken kalem "yazıyormuş gibi" sallanır |
| **Başlık** | Kalem logosu + ad + **tür seçici `💻 Kod ▾`** + Geri al + Kapat |
| **Seçenekler (akordeon)** | 5 satır: pastel resim + başlık + prompt'un tek satırlık özeti. Tıklanan açılır (aynı anda bir tane; ilki açık gelir) |
| **Açık satır** | Tam prompt (boşluklar sarı, doldurulunca yeşil), "✏️ Doldurursan cevap sana daha uygun olur" listesi, 💡 neden, **Bunu kullan →** |
| **Küçük resimler** | ⊙ Net: hedef tahtası · Detaylı: büyüteçli belge · Adım adım: bayraklı merdiven · Format: tablo · Önce soru: konuşma balonları (`components/resimler.ts`, elle çizilmiş SVG) |
| **Tema** | Açık modda krem kâğıt; site/bilgisayar koyu moddaysa sıcak kakao tonları |
| **Erişilebilirlik** | Satırlar klavyeyle açılır (Tab + Enter), ekran okuyucu için `aria-expanded`; "hareketi azalt"ta animasyon yok |

Görseller: [açık tema](docs/rapor/sekiller/arayuz-pastel-acik.png) · [koyu tema](docs/rapor/sekiller/arayuz-pastel-koyu.png) ·
[üç taslak](docs/rapor/sekiller/arayuz-taslaklar-abc.png)

## ~~Yıldızlı arayüz~~ (22.10.2026 sabah — Pastel Defter ile değiştirildi, tarihçe için duruyor)

Panel "gece gökyüzü" temasına geçti; ekran görüntüsü: [docs/rapor/sekiller/arayuz-yildizli-onizleme.png](docs/rapor/sekiller/arayuz-yildizli-onizleme.png)

| Öğe | Ne yapıyor |
|---|---|
| **✦ Geliştir küresi** | Pembe → mor → camgöbeği akan gradyan; çalışırken daha hızlı parlar, yıldız döner |
| **Gece paneli** | Lacivertten mora gradyan, iki katman parıldayan yıldız, arada bir kayan yıldız |
| **Strateji renkleri** | ⚡ Net (camgöbeği) · 🔭 Detaylı (lavanta) · 🪜 Adım adım (altın) · 🧩 Format (pembe) · 💬 Önce soru (nane) |
| **Kartlar** | Sırayla süzülerek gelir; solda parlayan renk şeridi; üstünde gelince hafif yükselir |
| **Beklerken** | "Yıldızlar hizalanıyor…" gibi dönen mesajlar + parıldayan yer tutucu kartlar |
| **Boşluk vurgusu** | `[hedef kitle]` gibi boşluklar altın renkte, kesikli çerçeveli + "✏️ 2 boşluk doldurulacak" rozeti (karar 0004, katman 1) |
| **Ayarlar sayfası** | Aynı yıldızlı tema |
| **Erişilebilirlik** | Koyu zemin üzerinde yüksek kontrast; "hareketi azalt" ayarı açık olanlarda tüm animasyonlar durur; klavye odağı altın çerçeve; Esc kapatır |

Renkleri değiştirmek için tek yer: `extension/entrypoints/content/style.css` en üstteki `:host { --... }` değişkenleri.

> 💡 Eklentiyi yüklerken klasör bulunamazsa: baştaki noktalı `.output` klasörü bazı pencerelerde görünmez.
> Derlenmiş klasörü noktasız bir yere kopyalayın (ör. `D:\D_SenaOz\AI projesi\SmarterPrompt-Eklenti`) ve onu seçin.
> Her `npm run build`'den sonra kopyayı yenileyip `chrome://extensions`'da 🔄'ye basın.


### Doldurulacaklar listesi (22.10.2026)
Her kartın altında **"📝 Doldurman gerekenler (n)"** listesi var; her boşluk için bir yazma kutusu. Yazdıkça
kartın önizlemesinde boşluk yeşile döner. **Kullan** → doldurulmuş metin yazı kutusuna gider; boş bırakılanlar
`[köşeli parantez]` olarak kalır. Enter = Kullan. Görsel: `docs/rapor/sekiller/arayuz-doldurma-listesi.png`

### Performans ölçümü (22.10.2026)
Eklenti simgesi → **Seçenekler** → **⏱️ Performans**: son 50 isteğin istek sayısı, başarı oranı, medyan süre,
4 sn altı oranı ve tablo (zaman, site, sonuç, toplam süre, sunucu süresi). Yalnızca bu tarayıcıda saklanır,
prompt metni saklanmaz; önbellekten gelenler ölçüme katılmaz (`extension/lib/performans.ts`, 3 test).
Toplam ile sunucu süresi arasındaki fark = ağ + eklenti payı.


### Görev türüne göre prompt — meta-prompt v2 (22.10.2026)
Sena'nın önerisi: "görsel, ses, metin, matematik için farklı yazması lazım". Kullanıcıya her seferinde
"ne için?" diye **sormuyoruz**; model türü otomatik algılar, panelin üstünde **"Algılanan tür: 🎨 Görsel ▾"**
çıkar, yanlışsa tek tıkla değiştirilir ve 5 seçenek o türe göre yeniden üretilir.

| Tür | Prompt'a eklenenler |
|---|---|
| 🎨 Görsel | konu, stil, ışık, renk paleti, kompozisyon, en-boy oranı, istenmeyenler |
| 🎵 Ses / müzik | tür, süre, tempo, duygu, enstrüman / ses tonu |
| 🧮 Matematik | verilenler, adım adım çözüm, doğrulama, birimler |
| 💻 Kod · ✍️ Metin · 📊 Analiz · 🌀 Diğer | v1'deki gibi |

Gerçek test: 4/4 tür doğru algılandı, 4.5-8 sn. Kalan kusur: görselde "Önce soru" bazen yapay zekânın ağzından.
Ayrıntı: [docs/kararlar/0005-gorev-turune-gore-prompt.md](docs/kararlar/0005-gorev-turune-gore-prompt.md).
Test seti v1.1 (120 prompt, +10 ses, +10 matematik): `data/test_prompts/test_prompts_v1_1.jsonl`.

### Kullanıcı geri bildirimi (22.10.2026)
Panelin altında **"Bu öneriler işine yaradı mı? 👍 👎"** + isteğe bağlı not → `POST /geri-bildirim` →
sunucuda `server/veri/geri_bildirim.jsonl`. Analiz: `eval/kullanici_calismasi.py --geri-bildirim ...`
(👍 oranı türe göre, tür düzeltme oranı, notlar). GitHub'da "Geri bildirim" issue şablonu da var.
Dört kanalın tamamı ve haftalık "geri bildirim → iyileştirme" döngüsü:
[docs/kullanici-calismasi/geri-bildirim.md](docs/kullanici-calismasi/geri-bildirim.md)


### Docker, sunucu adresi ayarı ve anket formu (22.10.2026)
- **Docker:** `server/Dockerfile` + kökte `docker-compose.yml` → `docker compose up --build`. Gerçek testte: konteyner
  sağlıklı, root olmayan kullanıcı, Gemini ile /enhance 4.3 sn, /geri-bildirim dosyaya yazıyor, `.env` imaja girmiyor.
  Aynı imaj Render / Hugging Face Spaces'e de yüklenebilir (platform `PORT` değişkenini verir).
- **Sunucu adresi ayarı:** Ayarlar → 🛰️ Sunucu adresi → Kaydet ve dene. Chrome yalnızca o adres için izin ister
  (`optional_host_permissions`). Şifresiz `http` yalnızca localhost'a izinli. Böylece **aynı zip** hem yerel hem
  ortak sunucuyla çalışır; bilgisayar öğrencileri kendi sunucularını çalıştırıp çalışmaya katılırken ortak adresi yazar.
- **Anket formu:** `docs/kullanici-calismasi/google-form/form_olustur.gs` → script.google.com'a yapıştır → Çalıştır →
  onam + hakkında + 10 SUS + görüşler + görüşme gönüllülüğü olan form ve yanıt tablosu oluşur. E-posta toplamaz.
- **Katılımcı rehberi:** `docs/kullanici-calismasi/kurulum-talimati.md` (Yol A hazır zip, Yol B GitHub + Docker).

---

## Eklenecekler: boşluk doldurma (önerildi, sıradaki özellik)

**Fikir (Sena):** Önerilen prompt'larda `[hedef kitle]`, `[programlama dili]` gibi köşeli parantezli boşluklar var.
Kullanıcı bunları doldurmadan gönderirse geliştirmenin faydası azalır. Şu an **Kullan**'a basınca metin yazı kutusuna
**düzenlenebilir** şekilde yazılıyor (gönderilmiyor), ama boşlukları doldurması gerektiğini hissettiren hiçbir şey yok.

**Neden "gönderdikten sonra sor" değil?** Mesaj gitmiş olur, eklenti onu değiştiremez; ikinci bir mesaj gerekir.
Bu yüzden uyarı **göndermeden önce** verilmeli.

**Plan (3 katman):**
1. **Kartta görünür kıl:** boşluklar renkli vurgulu + "✏️ 2 boşluk doldurulacak" rozeti.
2. **Kullan'a basınca mini form:** her boşluk için bir kutu → [Doldur ve kutuya yaz] / [Boşlukları bırak]
   ("Önce soru" stratejisinde boşluklar bilerek bırakılır, o yüzden bırakma seçeneği şart).
3. **Göndermeden önce yumuşak uyarı:** kutuda hâlâ `[...]` varsa üstte şerit: "⚠️ 1 boşluk doldurulmadı [Göster]".
   Gönderimi engellemez. Tarayıcı testinden sonra.

**Araştırma bonusu:** Anonim kayda `bosluk_sayisi` ve `doldurulan_bosluk` sayıları (metin değil) → raporda
"kullanıcılar boşlukların %X'ini doldurdu" bulgusu.

Ayrıntılı tasarım, hangi dosyanın nasıl değişeceği ve ön koşullar: [docs/kararlar/0004-bosluk-doldurma.md](docs/kararlar/0004-bosluk-doldurma.md)
