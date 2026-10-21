# SENA README — Hafta 1-4'te ne yaptık, nasıl çalışıyor, nasıl devam edilir?

Bu belge, projenin ilk 4 haftalık kod tarafını adım adım anlatır. Ekip arkadaşlarımın projeyi
klonlayıp **10 dakikada çalıştırabilmesi** ve her dosyanın ne işe yaradığını anlaması için yazıldı.

> Kısa durum özeti ve yapılacaklar listesi için: [CLAUDE.md](CLAUDE.md) → "Durum / Nerede kaldık"
> Hafta 5-9 (Claude/Gemini, ayarlar, hakem değerlendirmesi, kullanıcı çalışması) için: [ZEYNEP_README.md](ZEYNEP_README.md)

---

## İçindekiler

1. [Proje bir bakışta](#1-proje-bir-bakışta)
2. [Sistem nasıl çalışıyor? (veri akışı)](#2-sistem-nasıl-çalışıyor-veri-akışı)
3. [Kurulum: projeyi kendi bilgisayarında çalıştır](#3-kurulum-projeyi-kendi-bilgisayarında-çalıştır)
4. [Hafta hafta yapılanlar](#4-hafta-hafta-yapılanlar)
5. [Dosya dosya açıklama](#5-dosya-dosya-açıklama)
6. [Testler ve ölçüm](#6-testler-ve-ölçüm)
7. [GitHub ile çalışma (dallar, PR, commit)](#7-github-ile-çalışma)
8. [Elle yapılması gerekenler (kod dışı)](#8-elle-yapılması-gerekenler)
9. [Sık karşılaşılan sorunlar](#9-sık-karşılaşılan-sorunlar)
10. [Sıradaki adımlar (hafta 5-6)](#10-sıradaki-adımlar-hafta-5-6)

---

## 1. Proje bir bakışta

**Smarter Prompt**, ChatGPT (sonra Claude ve Gemini) sitesine eklenen bir tarayıcı eklentisidir.

1. Kullanıcı ChatGPT'ye `bana kod yaz` gibi kısa bir prompt yazar.
2. Sağ alttaki **✨ Geliştir** butonuna ya da **Ctrl+Shift+E**'ye basar.
3. Açılan panelde **5 kart** görür. Her kartta bir başlık, geliştirilmiş prompt ve tek cümlelik "neden daha iyi" açıklaması vardır.
4. **Kullan**'a basınca prompt yazı kutusuna yazılır. Kullanıcı isterse düzenleyip kendisi gönderir. **Geri al** ilk metni geri getirir.

| Strateji | Kod adı | Ne yapar | Dayanağı (makale) |
|---|---|---|---|
| Net ve kısa | `net` | Belirsizliği giderir, tek açık görev cümlesi | 26 ilke (Bsharat 2023) |
| Detaylı | `detayli` | Rol + amaç + hedef kitle + kısıtlar | 26 ilke, The Prompt Report |
| Adım adım | `adim_adim` | Önce plan, sonra çözüm | Chain-of-Thought, Zero-Shot Reasoners |
| Format odaklı | `format` | Çıktının biçimi ve uzunluğu | The Prompt Report |
| Önce soru | `soru` | Eksikler için `[köşeli parantez]` boşluk veya önce soru sor | Rephrase and Respond, Why Johnny Can't Prompt |

**En önemli kural:** Geliştirici, kullanıcının bilmediğimiz bilgisini **uydurmaz**. Örneğin "bana kod yaz"
için "Python ile" diye yazmaz; `[programlama dili]` diye boşluk bırakır.

---

## 2. Sistem nasıl çalışıyor? (veri akışı)

```
┌──────────────── Tarayıcı (Chrome) ────────────────┐        ┌──────── Sunucu (FastAPI) ────────┐      ┌─────────────┐
│                                                   │        │                                  │      │             │
│  chatgpt.com sayfası                              │        │  POST /enhance                   │      │  Model      │
│  ┌─────────────────────────────┐                  │        │   1. meta-prompt + kullanıcı     │      │  (Gemini /  │
│  │ İçerik betiği               │  mesaj           │  HTTP  │      prompt'u birleştirilir      │ ───▶ │  OpenAI /   │
│  │ (content/index.ts)          │ ───────▶ Arka    │ ─────▶ │   2. LiteLLM ile model çağrılır  │      │  Ollama)    │
│  │  - butonu/paneli çizer      │          plan    │        │   3. JSON Pydantic ile doğrulanır│ ◀─── │             │
│  │  - adaptörle kutuyu okur/yazar ◀─────── betiği │ ◀───── │   4. bozuksa 1 kez yeniden dener │      └─────────────┘
│  └─────────────────────────────┘  5 seçenek       │  JSON  │   5. 5 seçenek + süre döner      │
│                                  (background.ts)  │        │  API anahtarı SADECE burada      │
└───────────────────────────────────────────────────┘        └──────────────────────────────────┘
```

**Neden bir sunucu var, eklenti doğrudan modele gidemez mi?** Gidebilir ama o zaman API anahtarını
eklentinin içine koymamız gerekir. Eklenti kodu herkes tarafından okunabilir → anahtar çalınır, fatura bize
gelir. Bu yüzden anahtar yalnızca sunucuda, `.env` dosyasında durur.

**Neden içerik betiği değil de arka plan betiği istek atıyor?** İçerik betiği chatgpt.com'un içinde çalışır
ve sitenin güvenlik kuralları (CSP) localhost'a isteği engelleyebilir. Arka plan betiği eklentinin kendi
izinleriyle çalışır.

**Eklenti ile sunucu arasındaki sözleşme (JSON şeması):**

```json
{
  "gorev_turu": "kod",
  "eksik_bilgiler": ["programlama dili", "programın amacı"],
  "secenekler": [
    { "strateji": "net", "baslik": "Net ve kısa", "prompt": "...", "neden": "..." },
    "... toplam TAM 5 tane, her strateji bir kez ..."
  ],
  "model": "gemini/gemini-3.5-flash-lite",
  "meta_prompt_surumu": "v0",
  "sure_ms": 1840
}
```

Bu şema iki yerde tanımlı: sunucuda `server/app/schemas.py` (Pydantic), eklentide `extension/lib/schema.ts` (Zod).
**Birini değiştiren, diğerini de aynı PR'da değiştirir.**

---

## 3. Kurulum: projeyi kendi bilgisayarında çalıştır

### Gerekenler
- **Git**
- **Python 3.11+** → `python --version`
- **Node.js 20+** → `node -v`
- Bir model API anahtarı (ör. ücretsiz katmanı olan **Gemini**: https://aistudio.google.com/apikey)
  *ya da* ücretsiz ve internetsiz deneme için **Ollama** (https://ollama.com)

### Adım 1 — Repoyu klonla

```bash
git clone https://github.com/SENA-o7/smarter-prompt.git
cd smarter-prompt
git switch develop
```

### Adım 2 — Sunucuyu çalıştır

```bash
cd server
python -m venv .venv
.venv\Scripts\activate                 # Windows
# source .venv/bin/activate            # macOS / Linux
pip install -r requirements-dev.txt
copy ..\.env.example .env              # Windows   (macOS/Linux: cp ../.env.example .env)
```

Şimdi `server/.env` dosyasını aç ve anahtarını yaz:

```
MODEL=gemini/gemini-3.5-flash-lite
GEMINI_API_KEY=buraya-kendi-anahtarin
```

> **Ücretsiz kota uyarısı (gerçek testte öğrendik):** `gemini-2.5-flash` ücretsiz katmanda **günde yalnızca
> 20 istek** kabul ediyor. Bu yüzden varsayılan model `gemini-3.5-flash-lite`. Anahtarının erişebildiği modelleri
> görmek için: https://aistudio.google.com → model listesi.

Ollama kullanacaksan: `ollama pull llama3.1` yap ve `.env`'de `MODEL=ollama/llama3.1` yaz (anahtar gerekmez).

```bash
uvicorn app.main:app --reload --port 8000
```

Tarayıcıda **http://localhost:8000/docs** adresine git → `POST /enhance` → *Try it out* →
`{"prompt": "bana kod yaz"}` → *Execute*. 5 seçenek geliyorsa sunucu çalışıyor demektir. 🎉

### Adım 3 — Eklentiyi çalıştır (yeni bir terminalde)

```bash
cd extension
npm install
npm run dev
```

`npm run dev` eklentisi yüklenmiş ayrı bir Chrome penceresi açar. O pencerede **chatgpt.com**'a gir,
giriş yap, bir prompt yaz ve sağ alttaki **✨ Geliştir** butonuna bas.

Kendi Chrome'una elle yüklemek istersen:
1. `npm run build`
2. Chrome'da `chrome://extensions` → sağ üstte **Geliştirici modu**'nu aç
3. **Paketlenmemiş öğe yükle** → `extension/.output/chrome-mv3` klasörünü seç

---

## 4. Hafta hafta yapılanlar

### Hafta 1 — Kurulum ve araştırma
| İş | Nerede | Durum |
|---|---|---|
| Repo yapısı (extension / server / eval / data / scripts / docs) | kök | ✅ |
| `.gitignore` (`.env`, ham veri, node_modules asla commit edilmez) | `.gitignore` | ✅ |
| PR şablonu, görev ve hata issue şablonları, CODEOWNERS taslağı | `.github/` | ✅ |
| Araştırma soruları AS1-AS5 ve hipotezler | `docs/arastirma/arastirma-sorulari.md` | ✅ (ekip onayı bekliyor) |
| 16 makalelik okuma listesi + not şablonu | `docs/arastirma/makaleler/` | ✅ liste / ⬜ notlar |
| Rakip analizi tablosu ve kontrol listesi | `docs/arastirma/rakipler/README.md` | ✅ tablo / ⬜ denemeler |
| Repo inceleme notları ("onlar nasıl çözmüş / biz nasıl") | `docs/arastirma/repo-notlari.md` | ✅ başlangıç |
| Teknoloji seçimi kararı | `docs/kararlar/0001-teknoloji-secimi.md` | ✅ |
| Haftalık günlük şablonu | `docs/gunluk/_sablon.md` | ✅ |

### Hafta 2 — Veri ve meta-prompt v0
| İş | Nerede | Durum |
|---|---|---|
| Meta-prompt v0 (rehberdeki 6.3) | `server/app/meta_prompt.py` | ✅ |
| JSON şeması (sunucu Pydantic + eklenti Zod) ve karar kaydı | `schemas.py`, `schema.ts`, `docs/kararlar/0002-json-semasi.md` | ✅ |
| 20 prompt ile meta-prompt testi için betik | `eval/meta_prompt_testi.py` | ✅ betik / ⬜ gerçek modelle çalıştırma |
| Test seti **v0 (20)** ve **v1 (100)** prompt + veri kartı | `data/test_prompts/`, `data/README.md` | ✅ (ekip gözden geçirmeli) |
| WildChat indirme, filtreleme (KVKK), etiketleme betikleri | `scripts/data/` | ✅ |
| WXT ile eklenti, ChatGPT'de buton | `extension/` | ✅ |

### Hafta 3-4 — MVP (ChatGPT'de uçtan uca)
| İş | Nerede | Durum |
|---|---|---|
| ChatGPT adaptörü: kutuyu bul, oku, yaz (React editör tuzağı çözüldü) | `extension/adapters/` | ✅ |
| 5 kartlı panel, Kullan, Geri al, açık/koyu tema, Shadow DOM | `extension/entrypoints/content/` | ✅ |
| Ctrl+Shift+E kısayolu | `wxt.config.ts`, `background.ts` | ✅ |
| Arka planda önbellek (aynı prompt'a tekrar istek atmaz) | `background.ts` | ✅ |
| FastAPI `/enhance`, şema doğrulama, yeniden deneme | `server/app/main.py` | ✅ |
| Hata durumları: 422 boş prompt, 429 hız sınırı, 502 bozuk cevap, 503 model kapalı | `main.py` + eklentide Türkçe mesajlar | ✅ |
| Hız sınırı (slowapi, varsayılan 20/dk) | `main.py`, `.env` → `HIZ_SINIRI` | ✅ |
| promptfoo ile meta-prompt testleri | `eval/promptfoo/` | ✅ |
| CI: her PR'da eklenti + sunucu testleri | `.github/workflows/ci.yml` | ✅ |
| Meta-prompt testi iş akışı (gerçek model) | `.github/workflows/meta-prompt.yml` | ✅ (secret gerekli) |
| Release: `v0.1.0` etiketi → zip GitHub Release'e | `.github/workflows/release.yml` | ✅ iş akışı / ⬜ etiket |

---

## 5. Dosya dosya açıklama

### `server/` — Sunucu (K2)
| Dosya | Ne yapar |
|---|---|
| `app/main.py` | FastAPI uygulaması. `/health` ve `/enhance` uç noktaları, CORS (yalnızca eklentilere izin), hız sınırı, yeniden deneme mantığı. |
| `app/meta_prompt.py` | **Projenin beyni.** Modele verilen talimat metni (`META_PROMPT`), sürümü (`v0`), mesajları hazırlayan ve model cevabını JSON'a çeviren fonksiyonlar. Kullanıcı metni `<<< >>>` arasına konur ki model onu talimat sanmasın. |
| `app/schemas.py` | Pydantic modelleri: istek, cevap, tek seçenek. "Tam 5 seçenek, her strateji bir kez" kontrolü burada. |
| `app/providers.py` | LiteLLM ile model çağrısı. Model değiştirmek için kod değil `.env`'deki `MODEL` değişir. |
| `app/config.py` | `.env`'den ayarları okur: `MODEL`, `HIZ_SINIRI`, `IZINLI_KAYNAK_REGEX`. |
| `tests/test_enhance.py` | 9 test. Gerçek model yerine **sahte model** kullanılır → ücretsiz, hızlı, anahtarsız. |

### `extension/` — Eklenti (K1)
| Dosya | Ne yapar |
|---|---|
| `wxt.config.ts` | Manifest ayarları: ad, izinler, sunucu adresi izni, Ctrl+Shift+E kısayolu. |
| `entrypoints/background.ts` | Arka plan betiği. İçerik betiğinden mesajı alır, sunucuya istek atar, cevabı Zod ile doğrular, önbellekte tutar. Kısayolu dinler. |
| `entrypoints/content/index.ts` | ChatGPT sayfasında çalışır. Butonu ve 5 kartlı paneli çizer, Kullan / Geri al. |
| `entrypoints/content/style.css` | Panel stilleri. Shadow DOM içinde olduğu için ChatGPT'nin CSS'iyle çakışmaz. Açık/koyu tema otomatik. |
| `adapters/types.ts` | Tüm siteler için ortak arayüz + yardımcılar. **`editoreYaz`**: React editörüne doğru şekilde yazma (`insertText`). |
| `adapters/chatgpt.ts` | ChatGPT'nin yazı kutusu seçicileri. **ChatGPT arayüzü değişirse bakılacak ilk yer.** |
| `lib/schema.ts` | Zod şeması (sunucudaki `schemas.py`'nin karşılığı) ve mesaj tipleri. |
| `lib/config.ts` | Sunucu adresi (`http://localhost:8000`). |
| `tests/schema.test.ts` | Vitest ile şema testleri. |

### `eval/`, `data/`, `scripts/` — Veri ve ölçüm (K3)
| Dosya | Ne yapar |
|---|---|
| `data/test_prompts/test_prompts_v0.jsonl` | 20 prompt: meta-prompt'un ilk testi ve rakip analizi için. |
| `data/test_prompts/test_prompts_v1.jsonl` | 100 prompt: görev türü (kod 22, yazı 23, analiz 20, görsel 16, diğer 19) ve belirsizlik etiketli. |
| `data/README.md` | Veri kartı: kaynaklar, lisanslar, satır formatı, etiketleme kuralları, sürüm geçmişi. |
| `scripts/data/indir_wildchat.py` | WildChat-1M'den Türkçe ilk tur prompt'ları `data/raw/`'a indirir (git'e girmez). |
| `scripts/data/filtrele_turkce.py` | Uzunluk, tekrar ve **kişisel bilgi** (e-posta, telefon, TC no, IBAN) filtresi. |
| `scripts/data/etiketle.py` | Terminalde tek tuşla etiketleme (k/y/a/g/d + 1/2/3), kaldığı yerden devam eder. |
| `eval/meta_prompt_testi.py` | Test setini sunucuya gönderip şema geçerliliği, gecikme, görev türü uyumunu ölçer; CSV yazar. |
| `eval/promptfoo/` | promptfoo testleri: 5 seçenek, Türkçe cevap, "neden" dolu, yüksek belirsizlikte `[boşluk]` bırakılmış mı. |

---

## 6. Testler ve ölçüm

```bash
# Sunucu testleri (server/ içinde, venv aktif)
pytest            # 9 test
ruff check .      # kod stili

# Eklenti testleri (extension/ içinde)
npm run typecheck # TypeScript tip kontrolü
npm test          # 3 Vitest testi
npm run build     # derleme
```

**Meta-prompt'u gerçek modelle ölçmek** (sunucu açık ve `.env` dolu olmalı, repo kökünden):

```bash
pip install httpx
python eval/meta_prompt_testi.py                    # v0: 20 prompt
python eval/meta_prompt_testi.py --set data/test_prompts/test_prompts_v1.jsonl --limit 100
```

Örnek çıktı biçimi:
```
=== Özet ===
Meta-prompt sürümü : v0
Şema geçerliliği   : %__ (n = 20)  [hedef ≥ %98]
Gecikme            : medyan _._ sn, p95 _._ sn  [hedef: medyan < 4 sn]
Görev türü uyumu   : %__ (n = 20)
```
Bu sayıları haftalık günlüğe yazın; rapordaki "meta-prompt'un evrimi" bölümü bunlardan çıkacak.

**promptfoo** (sunucu açıkken):
```bash
npx promptfoo@latest eval -c eval/promptfoo/promptfooconfig.yaml
npx promptfoo@latest view
```

---

## 7. GitHub ile çalışma

```
main      ← sadece sürüm zamanı (v0.1.0, v0.5.0 ...), PR ile
develop   ← entegrasyon dalı, herkes buraya PR açar
feature/<alan>-<kisa-ad>   ← her iş için yeni dal (alan: ext, server, eval, data, docs)
```

Günlük akış:
```bash
git switch develop && git pull                       # 1) güncel develop
git switch -c feature/ext-claude-adapter             # 2) yeni dal
# ... kod yaz ...
git add -p                                           # 3) küçük, anlamlı commit'ler
git commit -m "feat(ext): Claude yazı kutusu adaptörü"
git fetch origin && git rebase origin/develop        # 4) her gün güncel tut
git push -u origin feature/ext-claude-adapter        # 5) gönder
# GitHub'da develop'a PR aç, "Closes #12" yaz, bir arkadaş incelesin, CI yeşil olsun → Squash and merge
```

Commit önekleri: `feat` (yeni özellik), `fix` (hata), `test`, `docs`, `data`, `chore`.

---

## 8. Elle yapılması gerekenler

Kodla yapılamayan, hafta 1-4'ten kalan işler:

1. **Gerçek modelle deneme:** `.env`'i doldur, sunucuyu aç, `python eval/meta_prompt_testi.py` çalıştır.
2. **ChatGPT'de tarayıcı testi:** Geliştir → Kullan → metin kutuya düzgün yazılıyor mu, Gönder doğru metni mi gönderiyor?
3. **GitHub ayarları** (Settings):
   - Branches/Rules: `main` ve `develop` için *PR zorunlu, en az 1 onay, CI başarılı olmalı, force push yasak*
   - Secrets and variables → Actions → `GEMINI_API_KEY`
   - Projects panosu: Backlog → Bu hafta → Devam ediyor → İncelemede → Bitti
   - `.github/CODEOWNERS` içine ekip üyelerinin GitHub kullanıcı adları
4. **Makale notları:** `docs/arastirma/makaleler/_sablon.md`'yi kopyalayarak.
5. **Rakip analizi:** PromptJolt, Prompt Pro, PromptCraft'ı aynı 10 prompt'la deneyip tabloyu doldurmak.
6. **Test seti gözden geçirme:** v1'deki 100 prompt Claude ile taslak olarak yazıldı; ekip okuyup gerçekçi olmayanları değiştirsin. 30 tanesini iki kişi bağımsız etiketleyip uyuşmazlıkları `data/README.md`'ye yazsın.
7. Hepsi tamamsa: `develop` → `main` PR ve `git tag v0.1.0 && git push origin v0.1.0`.

---

## 9. Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|---|---|
| Panelde "Sunucuya ulaşılamadı" | Sunucu açık mı? `uvicorn app.main:app --port 8000`. http://localhost:8000/health açılıyor mu? |
| "Model şu an yanıt vermiyor" (503) | `.env`'deki anahtar yanlış/eksik veya kota doldu. Sunucu terminalindeki hataya bak. |
| "Model geçerli bir cevap üretemedi" (502) | Model iki kez bozuk JSON döndürdü. Tekrar dene; sık oluyorsa meta-prompt'u iyileştir. |
| "Çok fazla istek" (429) | Dakikalık sınır doldu. `.env`'de `HIZ_SINIRI=100/minute` yapabilirsin. |
| Buton görünmüyor | Sayfayı yenile. `chrome://extensions`'da eklenti açık mı? |
| "Kullan"a bastım ama metin gönderilmiyor / eski metin gidiyor | ChatGPT editörü değişmiş olabilir → `extension/adapters/chatgpt.ts` seçicileri ve `adapters/types.ts` → `editoreYaz`. |
| Python betiğinde `UnicodeEncodeError` | Betiklerde düzeltildi; yeni betik yazarsan başına `sys.stdout.reconfigure(encoding="utf-8")` ekle. |
| `npm run typecheck` zod hatası veriyor | `extension/tsconfig.json`'da `esModuleInterop: true` olmalı (var). |

---

## 10. Sıradaki adımlar (hafta 5-6)

- **K1 (eklenti):** `adapters/claude.ts` ve `adapters/gemini.ts` yaz (ChatGPT adaptörünü örnek al),
  `content/index.ts`'te `location.hostname`'e göre adaptör seç, `wxt.config.ts`'te `matches`'e siteleri ekle.
  Ayarlar sayfası (dil, sunucu adresi), Playwright testi.
- **K2 (sunucu):** Görev türüne göre strateji içerikleri, meta-prompt v1 (`META_PROMPT_SURUMU = "v1"` +
  `docs/kararlar/0003-meta-prompt-v1.md`). Ölçüm betiğiyle v0 ve v1'i karşılaştır.
- **K3 (veri):** WildChat betikleriyle test setini 200'e çıkar (`test_prompts_v2.jsonl`), hakem değerlendirme
  betiği `eval/judge.py` (sıra değiştirmeli A-B / B-A).

Kolay gelsin! — Sena
