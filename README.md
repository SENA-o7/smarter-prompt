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

Hafta 1-4 (MVP) kodu hazır: sunucu `/enhance` uç noktası, ChatGPT eklentisi (gerçek tarayıcı testi bekliyor), 100 prompt'luk test seti,
ölçüm betikleri ve CI. Ayrıntılar: [SENA_README.md](SENA_README.md) · Nerede kaldık: [CLAUDE.md](CLAUDE.md).
Sırada: Claude/Gemini adaptörleri, ayarlar sayfası, hakem değerlendirmesi (hafta 5-7).

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
