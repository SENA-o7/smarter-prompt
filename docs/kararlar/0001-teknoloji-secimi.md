# 0001 - Teknoloji seçimi

Tarih: 21.10.2026 · Durum: kabul edildi

## Karar
- **Eklenti:** WXT + TypeScript (Manifest V3). Panel Shadow DOM içinde, MVP'de framework'süz (düz DOM).
  Panel büyüdükçe Preact'e geçilebilir.
- **Paket yöneticisi:** npm (rehberde pnpm önerilir; kurulum kolaylığı için npm ile başladık, istenirse geçilir).
- **Sunucu:** FastAPI + Pydantic v2 + LiteLLM + slowapi. API anahtarı yalnızca sunucuda.
- **Model:** `.env`'deki `MODEL` ile seçilir (varsayılan `gemini/gemini-2.5-flash`). Geliştirmede Ollama.

## Gerekçe
- WXT: sıcak yeniden yükleme, Chrome/Edge/Firefox derlemesi, hazır Shadow DOM yardımcısı.
- LiteLLM: sağlayıcı değiştirmek tek satır; değerlendirmede hakem modeli farklı aileden seçmek kolay.

## Sonuçlar
- Eklenti sunucuya `http://localhost:8000` üzerinden gider; dağıtımdan sonra `extension/lib/config.ts`
  ve `wxt.config.ts` içindeki `host_permissions` güncellenmeli.
