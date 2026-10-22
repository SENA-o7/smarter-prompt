# CLAUDE.md — Smarter Prompt

Bu dosya hem **Claude Code** hem de **ekip arkadaşları** için: projeyi açan biri (insan ya da yapay zekâ)
önce burayı okuyup "neredeyiz, sıradaki iş ne" sorusunun cevabını bulur.

> **KURAL:** Her çalışma oturumunun sonunda aşağıdaki **"Durum / Nerede kaldık"** bölümünü güncelle
> (tarih + kim + ne yapıldı + sıradaki adım). Claude Code kullanıyorsan ona "CLAUDE.md'deki durumu güncelle" de.

## Proje özeti

ChatGPT / Claude / Gemini'ye tarayıcı eklentisi olarak entegre olan prompt geliştirici. Kullanıcının kısa
prompt'unu anlamını değiştirmeden 5 stratejiyle (net, detayli, adim_adim, format, soru) yeniden yazar,
her birine "neden daha iyi" açıklaması ekler, seçimi kullanıcıya bırakır. Türkçe odaklı; etkisi LLM hakem
ve kullanıcı çalışmasıyla ölçülecek. 3 kişilik ders projesi, 10 haftalık plan.
Kaynak rehberler: `D:\D_SenaOz\AI projesi\*.pdf` (repoda değil). Ayrıntılı anlatım: [SENA_README.md](SENA_README.md) (hafta 1-4), [ZEYNEP_README.md](ZEYNEP_README.md) (hafta 5-9).

## Yapı

| Klasör | Ne | Sorumlu |
|---|---|---|
| `extension/` | WXT + TypeScript eklenti. `entrypoints/background.ts` (bulut/yerel mod, önbellek, seçim kaydı, kısayol), `entrypoints/content/` (adaptör seçimi + Shadow DOM), `entrypoints/options/` (ayarlar sayfası), `components/Panel.ts` (buton + 5 kart + düzenlendi takibi), `adapters/` (chatgpt, claude, gemini), `lib/` (schema, ayarlar, yerel_model, meta_prompt kopyası) | K1 |
| `server/` | FastAPI. `app/main.py` (/health, /enhance, /event, hız sınırı, kota→429, geçici hatada tekrar), `app/meta_prompt.py` (meta-prompt v0 ve v1 + ayrıştırma), `app/schemas.py` (Pydantic sözleşmesi), `app/providers.py` (LiteLLM) | K2 |
| `eval/` | `meta_prompt_testi.py` (geçerlilik/gecikme), `judge.py` (LLM hakem, sıra değiştirmeli), `analiz.py` (binom, ki-kare, grafikler), `kullanici_calismasi.py` (seçim + SUS), `promptfoo/` | K3 |
| `data/` | `test_prompts/*.jsonl` test setleri, `README.md` veri kartı; `raw/` git'e girmez | K3 |
| `scripts/data/` | WildChat indirme → filtreleme → etiketleme | K3 |
| `docs/` | `arastirma/` (makale notları, rakipler), `kararlar/` (ADR 0001-0003), `kullanici-calismasi/` (onam, SUS, görevler, görüşme), `gunluk/` (haftalık), `rapor/` | Hepsi |

## Komutlar

```bash
# Sunucu (server/ içinde)
python -m venv .venv && .venv\Scripts\activate && pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000     # .env gerekli (../.env.example'dan kopyala)
pytest            # model sahte, anahtar gerekmez
ruff check .

# Eklenti (extension/ içinde)
npm install
npm run dev       # Chrome eklenti yüklü açılır
npm run typecheck && npm test && npm run build

# Ölçüm (repo kökünden, sunucu açıkken)
python eval/meta_prompt_testi.py
npx promptfoo@latest eval -c eval/promptfoo/promptfooconfig.yaml
```

## Kurallar

- **JSON sözleşmesi:** `server/app/schemas.py` ↔ `extension/lib/schema.ts` aynı PR'da birlikte değişir.
- **Meta-prompt değişirse:** `META_PROMPT_SURUMU` artır + `docs/kararlar/` altına gerekçe yaz + `eval/meta_prompt_testi.py` ve promptfoo çalıştır.
- **Gizli bilgi yok:** API anahtarı yalnızca `server/.env` (git'e girmez). Ham veri (`data/raw/`) ve kullanıcı çalışması ham verisi repoya girmez.
- **Dallar:** `main` ← `develop` ← `feature/<alan>-<kisa-ad>` (alanlar: ext, server, eval, data, docs). Doğrudan main/develop'a push yok, PR ile.
- **Commit:** Conventional Commits, Türkçe: `feat(ext): ...`, `fix(server): ...`, `docs: ...`, `data: ...`.
- **Kod dili:** Değişken/fonksiyon adları ve yorumlar Türkçe (ASCII adlar: `gelistir`, `secenekler`); yorumlar "neden"i açıklar.
- **Windows:** Python betikleri `sys.stdout.reconfigure(encoding="utf-8")` ile başlar (cp1254 konsol sorunu).
- **Eklenti prompt'u asla kullanıcı adına göndermez**; yalnızca yazı kutusuna yazar.

## Durum / Nerede kaldık

**Son güncelleme: 22.10.2026 — Sena (Claude Code ile)**

### Şu an neredeyiz?
Kod tarafında **hafta 1-9 yazıldı**. Hafta 1-4 tarayıcı dışında doğrulandı; 5-9'un kodu otomatik testlerden geçiyor
ama **tarayıcıda hiç denenmedi**. Kalanlar çoğunlukla insan işi (tarayıcı testi, kullanıcı çalışması, rapor).

### Gerçek model testi (21.10.2026)
- Model: `gemini/gemini-3.5-flash-lite` (`gemini-2.5-flash`'ın ücretsiz kotası günde 20 istek; bugün doldu).
- 10 prompt: v0 ve v1 ikisi de şema %100, görev türü uyumu %100. Medyan süre v0 5.3 sn, v1 13.9 sn; ama art arda
  kontrolde fark yok → **gecikmeyi Google'ın o anki yükü belirliyor** (4-21 sn). Hedef < 4 sn ücretsiz katmanda tutmuyor.
  CSV'ler: `eval/results/meta_prompt_v{0,1}_20261021-15*.csv`. Varsayılan sürüm: v1.
- Ayrıntılı gözlemler: `docs/kararlar/0003-model-ve-meta-prompt-v1.md`, `ZEYNEP_README.md`.

### Bitti
- [x] **Yıldızlı arayüz** (22.10): gece paneli, strateji renkleri/simgeleri, parlayan küre, bekleme animasyonu, yıldızlı ayarlar sayfası; önizleme `docs/rapor/sekiller/arayuz-yildizli-onizleme.png`
- [x] Boşluk doldurma **katman 1-2**: vurgu + kart altında "Doldurman gerekenler" listesi (yazdıkça önizleme yeşile döner)
- [x] **Meta-prompt v2** (22.10): ses + matematik türleri, türe göre prompt; panelde "Algılanan tür ▾" ile tek tıkla düzeltme
      (karar 0005). Gerçek test 4/4 tür doğru. Kusur: görselde "Önce soru" bazen yapay zekânın ağzından → v3
- [x] **Geri bildirim**: panelde 👍/👎 + not → `POST /geri-bildirim` → `server/veri/geri_bildirim.jsonl`; analiz
      `eval/kullanici_calismasi.py`; plan `docs/kullanici-calismasi/geri-bildirim.md`; GitHub issue şablonu
- [x] Test seti v1.1 (120: +ses +matematik). Testler: sunucu 19/19, eklenti 18/18
- [x] **Docker** (`server/Dockerfile`, `docker-compose.yml`): derlendi, gerçek Gemini ile test edildi
- [x] **Sunucu adresi ayarı** (Ayarlar → 🛰️): aynı eklenti localhost ya da ortak sunucu; izin yalnızca o adrese. Eklenti testleri 20/20
- [x] **Anket formu**: `docs/kullanici-calismasi/google-form/form_olustur.gs` (Apps Script, onam + SUS + görüşler); katılımcı rehberi Yol A/B
- [x] **Performans bölümü** (Ayarlar → ⏱️ Performans): istek, başarı, medyan, 4 sn altı; `lib/performans.ts`. Eklenti testleri 17/17
- [x] Eklenti son kodla derlendi (`extension/.output/chrome-mv3`); kurulum ve deneme adımları kullanıcıya anlatıldı
- [x] Hafta 1-4: iskelet, CI, sunucu, ChatGPT eklentisi, test seti v0/v1, veri betikleri, ölçüm, promptfoo (bkz. SENA_README)
- [x] Hafta 5-6: Claude + Gemini adaptörleri, ortak Panel, ayarlar sayfası (dil, mod, onay), meta-prompt v1, model değişikliği
- [x] Hafta 7: `/event` anonim seçim kaydı (prompt metni yok, fazladan alan reddedilir), "düzenlendi" takibi, `eval/judge.py`
- [x] Hafta 8: `docs/kullanici-calismasi/` (onam formu, kurulum, 5 görev, SUS, görüşme rehberi)
- [x] Hafta 9: `eval/analiz.py`, `eval/kullanici_calismasi.py` (sahte veriyle doğrulandı), Gemini Nano yerel mod (deneysel)
- [x] Testler (güncel): sunucu 19/19, eklenti 20/20, tip kontrolü + derleme temiz

### ⭐ SIRADAKİ İŞ (Sena ile kararlaştırıldı, 22.10.2026)
- [ ] **Ortak sunucuyu Render'a taşı** — gerçek katılımcılardan önce şart (Yol A ve geri bildirimlerin tek yerde
      toplanması buna bağlı). Docker imajı hazır (`server/Dockerfile`). Gerekenler: Sena'nın Render hesabı (GitHub ile
      giriş) + **yeni** Gemini anahtarı (sohbete yapıştırılan eski anahtar ortak sunucuda kullanılmayacak, AI Studio'dan
      silinecek). Sonra: Render'da ortam değişkenleri (MODEL, GEMINI_API_KEY, META_PROMPT_SURUMU=v2), kalıcı disk ya da
      günlük yedek (`server/veri/`), adres → katılımcı rehberine ve forma.

### Denenmedi / yapılacak (öncelik sırasıyla)
- [ ] **Boşluk doldurma katman 3:** göndermeden önce yumuşak uyarı → `docs/kararlar/0004-bosluk-doldurma.md`. Ön koşul: tarayıcı testi
- [ ] **Tarayıcı testi** (Sena 22.10'da başladı; derlenmiş kopya: `D:\D_SenaOz\AI projesi\SmarterPrompt-Eklenti`): `npm run dev` → chatgpt.com, claude.ai, gemini.google.com → Geliştir → Kullan → Gönder. Seçici kırıksa `extension/adapters/<site>.ts`
- [ ] Ayarlar sayfası, seçim kaydı (`server/veri/olaylar.jsonl`), Gemini Nano modu tarayıcıda
- [ ] Repo: arkadaşları **collaborator** ekle (Settings → Collaborators); dal koruması; `GEMINI_API_KEY` secret
- [ ] Tür algılama doğruluğunu 120 prompt'ta ölç (`--set data/test_prompts/test_prompts_v1_1.jsonl`), kotaya göre günlere böl
- [ ] Meta-prompt v3: görselde "Önce soru" kullanıcının ağzından olsun (karar 0005)
- [ ] Hakem için farklı aileden anahtar (ör. `OPENAI_API_KEY`) → `python eval/judge.py --limit 10`
- [ ] Test seti v2 (200) — WildChat betikleri; v1'deki 100 prompt'u ekip gözden geçirsin
- [ ] Süre hedefi (< 4 sn) tutmuyor: daha hızlı model / daha kısa meta-prompt dene
- [ ] Hafta 8: hocaya danış (etik), sunucuyu internete taşı (Docker imajı hazır → Render/HF Spaces), formu
      `form_olustur.gs` ile oluştur, katılımcıya `kurulum-talimati.md` + ortak sunucu adresi gönder, 12-15 katılımcı
- [ ] Hafta 10: rapor (`docs/rapor/`), sunum, demo videosu, `v1.0.0`
- [ ] Gemini API anahtarı sohbete yapıştırıldı → test bitince AI Studio'dan yenile

## Fikirler ve öneriler (herkes ekleyebilir)

Aklına bir fikir, sorun ya da soru gelirse buraya **en alta** bir satır ekle ve PR ile gönder. Büyük bir fikirse
`docs/kararlar/NNNN-kisa-ad.md` dosyası aç (durum: önerildi) ve buradan bağlantı ver. Ekipçe konuşulup karar
verilince durumu güncelle. Claude Code kullanıyorsan "CLAUDE.md'deki fikirlere şunu ekle: ..." demen yeterli.

Biçim: `- [durum] Fikir — Öneren (tarih) — bağlantı`
Durumlar: 💡 önerildi · 🗣️ tartışılıyor · ✅ kabul edildi (yapılacaklara taşındı) · ❌ reddedildi (nedeniyle)

- ✅ Boşlukları gönderdikten sonra değil, **göndermeden önce** doldurt: kartta vurgula + Kullan'da mini form +
  yumuşak uyarı; doldurma oranını anonim ölç — Sena (21.10.2026) — [0004](docs/kararlar/0004-bosluk-doldurma.md)
- ❌ Gönderdikten sonra eklentinin "hedef kitleyi girin" diye sorması — Sena (21.10.2026) — mesaj gitmiş olur,
  ikinci mesaj gerekir; yerine yukarıdaki çözüm seçildi
- 💡 Süre hedefi (< 4 sn) ücretsiz katmanda tutmuyor: daha kısa meta-prompt, akış (streaming) ile kartları tek tek
  göstermek veya ücretli katman — Claude (21.10.2026)
- 💡 Hakem değerlendirmesi için farklı aileden ücretsiz bir model bulmak (OpenAI / Anthropic / Ollama yerel) — Claude (21.10.2026)
- ✅ Görev türüne göre farklı prompt: görsel / ses / metin / matematik; her seferinde sormak yerine otomatik algıla +
  panelde tek tıkla değiştir — Sena (22.10.2026) — [0005](docs/kararlar/0005-gorev-turune-gore-prompt.md)
- 💡 Video türü ayrı mı olmalı? Şimdilik görsel altında; geri bildirime göre karar — Claude (22.10.2026)
- ❌ "Pastel Defter" arayüzü (krem zemin, akordeon seçenekler, elle çizilmiş SVG resimler) denendi; Sena **yıldızlı
  temayı daha çok beğendi**, geri alındı — Sena (22.10.2026). Kod geçmişte duruyor: geri getirmek için
  `git revert 3ec65d3`. İçindeki akordeon / SVG resim fikirleri yıldızlı temaya ayrı ayrı uyarlanabilir.
<!-- Yeni fikirleri bu satırın üstüne ekleyin -->
