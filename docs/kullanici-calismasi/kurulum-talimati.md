# Katılımcı kurulum rehberi

Smarter Prompt'u denediğin için teşekkürler! İki yol var:

| | **Yol A — Hızlı kurulum** | **Yol B — GitHub'dan kendin çalıştır** |
|---|---|---|
| Kimin için | Herkes | Bilgisayar / yazılım öğrencileri |
| Süre | ~5 dakika | ~15 dakika |
| Gerekenler | Chrome | Chrome, Git, Docker (ya da Python 3.11+), Node.js 20+, **kendi** Gemini API anahtarın |
| Sunucu | Ekibin ortak sunucusu | İstersen kendi bilgisayarında, istersen ortak sunucu |

> **Kullanıcı çalışmasına katılıyorsan** hangi yolu seçersen seç, Ayarlar'daki **Sunucu adresi**'ne ekibin verdiği
> ortak adresi yaz. Yoksa geri bildirimlerin senin bilgisayarında kalır, bize ulaşmaz.

---

## Yol A — Hızlı kurulum (herkes)

1. Zip'i indir: **[GitHub Release bağlantısı — ekip dolduracak]**
2. Zip'i bir klasöre çıkar (ör. Masaüstü → `SmarterPrompt`). Klasörü silme.
3. Chrome'da adres çubuğuna `chrome://extensions` yaz.
4. Sağ üstte **Geliştirici modu**'nu aç.
5. **Paketlenmemiş öğe yükle** → çıkardığın klasörü seç (içinde `manifest.json` olan klasör).
6. Sağ üstteki 🧩 simgesi → **Smarter Prompt** → 📌 sabitle.
7. Simgeye sağ tık → **Seçenekler**:
   - **🛰️ Sunucu adresi:** ekibin verdiği adresi yaz → **Kaydet ve dene** → Chrome izin sorarsa **İzin ver** →
     "✅ Bağlandı" görmelisin.
   - **Kullanıcı çalışması:** "Araştırmaya katılmayı kabul ediyorum" kutusunu işaretle.
   - Sayfadaki **8 karakterlik katılımcı kodunu** not et (anket formunda soracağız).
8. chatgpt.com, claude.ai ya da gemini.google.com'u aç (açıksa **F5**). Sağ altta **✦ Geliştir** küresini görmelisin.

## Yol B — GitHub'dan kendin çalıştır (bilgisayar öğrencileri)

### 1. Repoyu al
```bash
git clone https://github.com/SENA-o7/smarter-prompt.git
cd smarter-prompt
```

### 2. Gemini API anahtarı al (ücretsiz)
https://aistudio.google.com/apikey → **Create API key** → kopyala.
> Ücretsiz katman günde sınırlı istek kabul eder; kendi anahtarını kullanmak ortak kotayı korur.

### 3. Sunucuyu çalıştır — **Docker ile (önerilen)**
```bash
copy .env.example server\.env        # macOS/Linux: cp .env.example server/.env
# server/.env dosyasını aç → GEMINI_API_KEY= satırına anahtarını yapıştır
docker compose up --build
```
Tarayıcıda http://localhost:8000/health → `{"durum":"ok", ...}` görmelisin.
Kayıtlar (seçimler, geri bildirimler) `server/veri/` klasörüne yazılır.

<details>
<summary>Docker yoksa: Python ile</summary>

```bash
cd server
python -m venv .venv
.venv\Scripts\activate               # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```
</details>

### 4. Eklentiyi derle ve yükle
```bash
cd extension
npm install
npm run build
```
Chrome → `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** → `extension/.output/chrome-mv3`
(noktalı `.output` klasörü görünmüyorsa adresi pencerenin yol çubuğuna yapıştır).

Ya da `npm run dev`: eklentisi yüklü ayrı bir Chrome açar, kod değişince kendiliğinden yenilenir.

### 5. Ayarlar
Varsayılan sunucu adresi `http://localhost:8000` → kendi sunucunu kullanıyorsan bir şey yapma.
Çalışmaya katılıyorsan Yol A'nın 7. adımındaki gibi ortak adresi yaz ve onay kutusunu işaretle.

> Kodu inceleyip iyileştirme önermek istersen: [CLAUDE.md](../../CLAUDE.md) → "Fikirler ve öneriler" ya da GitHub'da
> **Issues → New issue → Geri bildirim**.

---

## Nasıl kullanılır?
1. Yazı kutusuna kısa bir prompt yaz (ör. `bana kod yaz`). **Gönderme.**
2. **✦ Geliştir**'e bas (ya da **Ctrl+Shift+E**) → 5-15 sn içinde 5 kart gelir.
3. Üstteki **"Algılanan tür"** yanlışsa (ör. görsel istiyordun ama "Metin" yazıyor) değiştir; seçenekler yeniden üretilir.
4. Bir kartta **📝 Doldurman gerekenler** varsa doldur (zorunlu değil) → **Kullan ➜**.
5. Metin yazı kutusuna gelir; istersen düzenle, **sen gönder**. **↶ Geri al** ilk yazdığına döner.
6. Panelin altındaki **👍 / 👎** ile bize kısa geri bildirim ver.

## Bir hafta sonunda
Ekibin gönderdiği **anket formunu** doldur (~7 dakika). Formda katılımcı kodunu soracağız.

## Sorun mu var?
| Gördüğün | Ne yapmalı |
|---|---|
| ✦ Geliştir küresi yok | Sayfayı yenile (F5); `chrome://extensions`'da eklenti açık mı? |
| "Sunucuya ulaşılamadı" | Ayarlar → Sunucu adresi → **Kaydet ve dene**. Yol B'deysen sunucu terminali açık mı? |
| "Model kotası doldu" | Bir dakika bekle. Yol B'deysen kendi anahtarının günlük kotası dolmuş olabilir. |
| Kullan'a bastım, metin kutuya gelmedi | Ekran görüntüsüyle bize bildir: [ekip iletişim] |

**Gizlilik:** Prompt metnin geliştirilmek için sunucuya ve Google Gemini'ye gider ama **kaydedilmez**.
Hassas bilgi (TC kimlik no, sağlık bilgisi, şifre) içeren metinlerde eklentiyi kullanma.
