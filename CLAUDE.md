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
Kaynak rehberler: `D:\D_SenaOz\AI projesi\*.pdf` (repoda değil). Ayrıntılı anlatım: [SENA_README.md](SENA_README.md).

## Yapı

| Klasör | Ne | Sorumlu |
|---|---|---|
| `extension/` | WXT + TypeScript eklenti. `entrypoints/background.ts` (sunucuya istek, önbellek, kısayol), `entrypoints/content/` (buton + Shadow DOM panel), `adapters/` (site başına yazı kutusu erişimi), `lib/schema.ts` (Zod sözleşmesi) | K1 |
| `server/` | FastAPI. `app/main.py` (/health, /enhance, hız sınırı, yeniden deneme), `app/meta_prompt.py` (meta-prompt + ayrıştırma), `app/schemas.py` (Pydantic sözleşmesi), `app/providers.py` (LiteLLM) | K2 |
| `eval/` | `meta_prompt_testi.py` (geçerlilik/gecikme ölçümü), `promptfoo/` (regresyon testleri) | K3 |
| `data/` | `test_prompts/*.jsonl` test setleri, `README.md` veri kartı; `raw/` git'e girmez | K3 |
| `scripts/data/` | WildChat indirme → filtreleme → etiketleme | K3 |
| `docs/` | `arastirma/` (makale notları, rakipler), `kararlar/` (ADR), `gunluk/` (haftalık), `rapor/` | Hepsi |

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

**Son güncelleme: 21.10.2026 — Sena (Claude Code ile)**

### Bitti (hafta 1-4 kod tarafı)
- [x] Repo iskeleti, `.gitignore`, `.env.example`, LICENSE, PR/issue şablonları, CODEOWNERS taslağı
- [x] CI: eklenti (typecheck, vitest, zip) + sunucu (ruff, pytest) — `.github/workflows/ci.yml`
- [x] Meta-prompt testi iş akışı (gerçek model, elle/haftalık) — `.github/workflows/meta-prompt.yml`
- [x] Release iş akışı (`v*` etiketi → zip Release'e) — `.github/workflows/release.yml`
- [x] Sunucu: `/enhance`, Pydantic şema, bozuk JSON'da 1 yeniden deneme (502), model hatasında 503, hız sınırı (429), CORS — 9 test
- [x] Eklenti: ChatGPT adaptörü, ✨ Geliştir butonu, Ctrl+Shift+E, 5 kartlı panel (Shadow DOM, açık/koyu tema), Kullan / Geri al, önbellek — 3 test
- [x] Test seti v0 (20) ve v1 (100) — `data/test_prompts/`
- [x] Veri betikleri: `indir_wildchat.py`, `filtrele_turkce.py`, `etiketle.py`
- [x] Ölçüm: `eval/meta_prompt_testi.py`, `eval/promptfoo/`
- [x] Docs: araştırma soruları, okuma listesi + şablon, rakip tablosu, repo notları, günlük şablonu, karar 0001-0002

### Elle yapılması gereken (kod dışı, hafta 1-4'ten kalan)
- [ ] **Gerçek API anahtarıyla deneme:** `server/.env` doldur → sunucu → `python eval/meta_prompt_testi.py` → sonucu `docs/gunluk/`'e yaz
- [ ] **ChatGPT'de tarayıcı testi:** `npm run dev` → chatgpt.com → Geliştir → Kullan → Gönder; seçici kırıksa `extension/adapters/chatgpt.ts`
- [ ] GitHub ayarları: `main`/`develop` dal koruması, Projects panosu, `GEMINI_API_KEY` secret, CODEOWNERS'a kullanıcı adları
- [ ] Makale okuma notları (`docs/arastirma/makaleler/`), rakip analizi (`docs/arastirma/rakipler/`)
- [ ] Test seti v1'i ekip gözden geçirsin (prompt'lar Claude ile taslak yazıldı); 30 prompt'u iki kişi bağımsız etiketlesin
- [ ] Yukarıdakiler tamamsa: `develop` → `main` PR, `v0.1.0` etiketi

### Sıradaki (hafta 5-6)
- [ ] K1: Claude ve Gemini adaptörleri (`extension/adapters/claude.ts`, `gemini.ts`), içerik betiğinde siteye göre adaptör seçimi, ayarlar sayfası, Playwright testi
- [ ] K2: Görev türüne göre strateji içerikleri, meta-prompt v1 (+ `docs/kararlar/0003-...`)
- [ ] K3: Test seti 200'e (WildChat betikleriyle), hakem değerlendirme betiği `eval/judge.py`
