# 0002 - JSON şeması (eklenti ↔ sunucu sözleşmesi)

Tarih: 21.10.2026 · Durum: kabul edildi

## Karar
Model çıktısı ve `/enhance` cevabı şu şemaya uyar; sunucuda Pydantic (`server/app/schemas.py`),
eklentide Zod (`extension/lib/schema.ts`) ile doğrulanır.

```json
{
  "gorev_turu": "kod | yazi | analiz | gorsel | diger",
  "eksik_bilgiler": ["..."],
  "secenekler": [
    { "strateji": "net | detayli | adim_adim | format | soru", "baslik": "...", "prompt": "...", "neden": "..." }
  ],
  "model": "gemini/gemini-2.5-flash",
  "meta_prompt_surumu": "v0",
  "sure_ms": 1840
}
```

- `secenekler` tam 5 eleman; her strateji tam bir kez. Sunucu kartları sabit sıraya dizer.
- Model geçersiz JSON döndürürse sunucu **bir kez** yeniden dener, yine olmazsa `502` döner.

## Kural
Şemayı değiştiren her PR iki dosyayı da günceller (PR şablonunda kontrol maddesi var).
