# Veri kartı

Bu projede veri model eğitmek için değil, **test etmek ve etkiyi kanıtlamak** için kullanılır.

## Dosyalar

| Dosya | İçerik | Kaynak | Durum |
|---|---|---|---|
| `test_prompts/test_prompts_v0.jsonl` | 20 prompt; meta-prompt v0'ın elle testi ve rakip analizi | ekip | ✅ |
| `test_prompts/test_prompts_v1.jsonl` | 100 prompt (v0'ın 20'si + 80 yeni) | ekip (Claude ile taslak; ekip gözden geçirecek) | ✅ |
| `test_prompts/test_prompts_v2.jsonl` | 200 prompt (6. hafta) | + LMSYS (repoya girmez) | ⬜ |
| `reference/bpo_ornek_tr.jsonl` | 30-50 BPO çifti, Türkçeye çevrilmiş | thu-coai/BPO | ⬜ |
| `raw/` | İndirilen ham veri — **git'e girmez** | `scripts/data/` | — |

## Satır formatı

```json
{"id": "tp-0042", "prompt": "bana kod yaz", "gorev_turu": "kod", "belirsizlik": "yuksek", "kaynak": "ekip", "not": ""}
```

- `gorev_turu`: `kod | yazi | analiz | gorsel | diger`
- `belirsizlik`: `dusuk | orta | yuksek`
- `kaynak`: `ekip | gonullu | wildchat | lmsys`

## Etiketleme kuralları

<!-- 30 prompt iki kişi tarafından bağımsız etiketlendikten sonra uyuşmazlıklardan çıkan kurallar buraya. -->
- `yuksek` belirsizlik: görev var ama dil/konu/amaç/biçimden en az ikisi eksik.
- `orta`: biri eksik. `dusuk`: model ek bilgi olmadan iyi cevap verebilir.

## Lisanslar ve gizlilik

- WildChat-1M: ODC-BY. LMSYS-Chat-1M: lisans sözleşmesi, yeniden dağıtım kısıtlı → LMSYS kaynaklı prompt'lar repoya **girmez**.
- Gerçek prompt'larda isim, telefon, e-posta, adres varsa çıkarılır.
- Kullanıcı çalışması ham verisi yalnızca ekip Drive'ında; repoya sadece anonim, toplu özet.

## Sürüm geçmişi

- v0 (21.10.2026): 20 ekip prompt'u.
- v1 (21.10.2026): 100 prompt. Dağılım: kod 22, yazi 23, analiz 20, gorsel 16, diger 19; belirsizlik yuksek 55, orta 39, dusuk 6.
  WildChat kaynaklı prompt'lar v2'de `scripts/data/` betikleriyle eklenecek.
