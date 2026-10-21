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

**Son güncelleme: 21.10.2026 akşam — Sena (Claude Code ile)**

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
- [x] Hafta 1-4: iskelet, CI, sunucu, ChatGPT eklentisi, test seti v0/v1, veri betikleri, ölçüm, promptfoo (bkz. SENA_README)
- [x] Hafta 5-6: Claude + Gemini adaptörleri, ortak Panel, ayarlar sayfası (dil, mod, onay), meta-prompt v1, model değişikliği
- [x] Hafta 7: `/event` anonim seçim kaydı (prompt metni yok, fazladan alan reddedilir), "düzenlendi" takibi, `eval/judge.py`
- [x] Hafta 8: `docs/kullanici-calismasi/` (onam formu, kurulum, 5 görev, SUS, görüşme rehberi)
- [x] Hafta 9: `eval/analiz.py`, `eval/kullanici_calismasi.py` (sahte veriyle doğrulandı), Gemini Nano yerel mod (deneysel)
- [x] Testler: sunucu 14/14, eklenti 9/9, tip kontrolü + derleme temiz

### Denenmedi / yapılacak (öncelik sırasıyla)
- [ ] **Tarayıcı testi:** `npm run dev` → chatgpt.com, claude.ai, gemini.google.com → Geliştir → Kullan → Gönder. Seçici kırıksa `extension/adapters/<site>.ts`
- [ ] Ayarlar sayfası, seçim kaydı (`server/veri/olaylar.jsonl`), Gemini Nano modu tarayıcıda
- [ ] Repo: arkadaşları **collaborator** ekle (Settings → Collaborators); dal koruması; `GEMINI_API_KEY` secret
- [ ] Hakem için farklı aileden anahtar (ör. `OPENAI_API_KEY`) → `python eval/judge.py --limit 10`
- [ ] Test seti v2 (200) — WildChat betikleri; v1'deki 100 prompt'u ekip gözden geçirsin
- [ ] Süre hedefi (< 4 sn) tutmuyor: daha hızlı model / daha kısa meta-prompt dene
- [ ] Hafta 8: hocaya danış (etik), sunucuyu internete taşı (Render/HF Spaces), 12-15 katılımcı
- [ ] Hafta 10: rapor (`docs/rapor/`), sunum, demo videosu, `v1.0.0`
- [ ] Gemini API anahtarı sohbete yapıştırıldı → test bitince AI Studio'dan yenile
