# Smarter Prompt

ChatGPT, Claude ve Gemini'ye tarayıcı eklentisi olarak entegre olan prompt geliştirici.
Kısa ve belirsiz bir prompt'u, **anlamını değiştirmeden** 5 farklı stratejiyle yeniden yazar,
her seçeneğin neden daha iyi olduğunu açıklar ve seçimi kullanıcıya bırakır.

1. Yazı kutusuna kısa bir prompt yaz ("bana kod yaz").
2. **✨ Geliştir** butonuna ya da `Ctrl+Shift+E`'ye bas.
3. Paneldeki 5 karttan birini seç → prompt kutuya yazılır. İstersen düzenleyip gönder; **Geri al** ile eskisine dön.

| # | Strateji | Ne ekler | Dayanağı |
|---|---|---|---|
| 1 | Net ve kısa | Belirsizliği giderir, tek açık görev | Principled Instructions (26 ilke) |
| 2 | Detaylı | Rol, amaç, hedef kitle, kısıtlar | 26 ilke, The Prompt Report |
| 3 | Adım adım | Önce plan, sonra çözüm | Chain-of-Thought, Zero-Shot Reasoners |
| 4 | Format odaklı | Çıktının biçimi ve uzunluğu | The Prompt Report |
| 5 | Önce soru | Eksikler için `[boşluk]` veya önce soru sorma | Rephrase and Respond, Why Johnny Can't Prompt |

## Durum

- **Hafta 1-4** (MVP): sunucu, ChatGPT eklentisi, test seti, ölçüm, CI → [SENA_README.md](SENA_README.md)
- **Hafta 5-9**: Claude + Gemini desteği, ayarlar, anonim seçim kaydı, hakem değerlendirmesi, kullanıcı çalışması
  materyalleri, analiz betikleri, Gemini Nano yerel mod → [ZEYNEP_README.md](ZEYNEP_README.md)
- **Gerçek model testi** (`gemini-3.5-flash-lite`, 10 prompt, meta-prompt v0 ve v1): geçerli cevap %100, görev türü
  uyumu %100; süre Google'ın yüküne göre 4-21 sn (ayrıntı: `docs/kararlar/0003-model-ve-meta-prompt-v1.md`).
- **Meta-prompt v2** (22.10): görev türüne göre prompt (🎨 görsel, 🎵 ses, 🧮 matematik, 💻 kod, ✍️ metin…); tür otomatik
  algılanır, panelde tek tıkla değiştirilir. Panelde 👍/👎 geri bildirim. "Pastel Defter" arayüzü (küçük resimler,
  akordeon seçenekler, açık/koyu tema).
- **Henüz tarayıcıda denenmedi.** Nerede kaldık ve sıradaki işler: [CLAUDE.md](CLAUDE.md)

## Sık sorulanlar

**Arka planda hangi yapay zekâ var?** Sunucu, Google'ın **Gemini API**'sini kullanıyor (şu an
`gemini-3.5-flash-lite`). Model `server/.env`'deki `MODEL=` satırından değişir; LiteLLM sayesinde OpenAI,
Anthropic veya bilgisayarda çalışan Ollama da kullanılabilir.

**Kendi yapay zekâ modelimizi eğittik mi?** **Hayır, ve bu bilinçli bir karar.** Rehberde "kendi dil modelimizi
eğitmek kapsam dışı" yazıyor. Biz hazır bir modeli **meta-prompt** ile yönlendiriyoruz: modele
"bu prompt'u şu 5 stratejiyle, şu kurallarla geliştir" diyen bir talimat metni veriyoruz
(`server/app/meta_prompt.py`). Projenin "öğrenen" kısmı modelin ağırlıkları değil, bu talimatın kendisi:
gerçek testlerden ve kullanıcı geri bildirimlerinden çıkan bulgularla meta-prompt'u sürüm sürüm iyileştiriyoruz
(v0 → v1 → v2; gerekçeleri `docs/kararlar/`). Bu, literatürdeki "prompt optimizasyonu" yaklaşımıdır
(APE, OPRO, ProTeGi). Model eğitmeye (ör. BPO gibi) göre çok daha ucuz, hızlı ve ders süresine sığar;
farkı raporun "İlgili çalışmalar" bölümünde tartışılır.

**Kullanıcı geri bildirimleri nerede toplanıyor?** Bkz. [docs/kullanici-calismasi/geri-bildirim.md](docs/kullanici-calismasi/geri-bildirim.md).

## Repo yapısı

```
extension/   WXT + TypeScript eklenti (K1)
server/      FastAPI + LiteLLM sunucu (K2)
eval/        otomatik değerlendirme ve analiz (K3)
data/        test prompt setleri ve veri kartı (K3)
scripts/     veri indirme / filtreleme
docs/        araştırma notları, karar kayıtları, haftalık günlükler, rapor
```

## Çalıştırma

### 1. Sunucu

**En kolayı — Docker** (Python kurmaya gerek yok):
```bash
copy .env.example server\.env         # macOS/Linux: cp .env.example server/.env  → GEMINI_API_KEY'i doldur
docker compose up --build
```
http://localhost:8000/health → `{"durum":"ok", ...}`. Seçim ve geri bildirim kayıtları `server/veri/` klasörüne yazılır.

**Ya da Python ile:**

```bash
cd server
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
copy ..\.env.example .env         # macOS/Linux: cp ../.env.example .env  → anahtarı doldur
uvicorn app.main:app --reload --port 8000
```

`http://localhost:8000/docs` adresinden `/enhance` denenebilir. Testler: `pytest` (model çağrıları sahte, anahtar gerekmez).

Ücretsiz yerel geliştirme için [Ollama](https://ollama.com) kurup `.env`'de `MODEL=ollama/llama3.1` yazabilirsiniz.

### 2. Eklenti

```bash
cd extension
npm install
npm run dev        # Chrome açılır, eklenti yüklü gelir; kod değişince yenilenir
```

Ayarlar: eklenti simgesine sağ tık → **Seçenekler** (🛰️ sunucu adresi, dil, bulut/yerel mod, araştırma onayı, ⏱️ performans).
Sunucu adresi değiştirilebildiği için aynı eklenti hem `localhost`'a hem ekibin ortak sunucusuna bağlanabilir.

**Denemek isteyenler (katılımcılar, bilgisayar öğrencileri):** [docs/kullanici-calismasi/kurulum-talimati.md](docs/kullanici-calismasi/kurulum-talimati.md)

Elle yüklemek için: `npm run build` → `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** → `extension/.output/chrome-mv3`.

## Ekip çalışması

Dal modeli: `main` (teslim) ← `develop` (entegrasyon) ← `feature/<alan>-<kisa-ad>`.
Alanlar: `ext`, `server`, `eval`, `data`, `docs`. Doğrudan `main`/`develop`'a push yok; her şey PR ile.
Commit mesajları [Conventional Commits](https://www.conventionalcommits.org/): `feat(ext): ...`, `fix(server): ...`, `docs: ...`.

> **JSON sözleşmesi:** `server/app/schemas.py` ile `extension/lib/schema.ts` aynı PR'da birlikte güncellenir.

## Gizlilik

Bulut modunda prompt metni bizim sunucumuza ve seçilen model sağlayıcısına gider. API anahtarı yalnızca
sunucuda, ortam değişkeninde durur; eklenti kodunda anahtar yoktur.

## Lisans

MIT
