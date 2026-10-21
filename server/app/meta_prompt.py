"""Meta-prompt ve model çıktısının ayrıştırılması.

Meta-prompt nedir? Modele "kullanıcının prompt'unu şu kurallarla 5 farklı şekilde geliştir
ve sonucu şu JSON biçiminde ver" diyen talimat metnidir. Projenin "beyni" burasıdır.

Sürümleme: Meta-prompt her değiştiğinde META_PROMPT_SURUMU artırılır (v0 → v1 → ...)
ve değişikliğin gerekçesi docs/kararlar/ altına yazılır. Rapordaki "meta-prompt'un evrimi"
bölümü bu kayıtlardan çıkacak.
"""

import json
import re

from . import config
from .schemas import GelistirmeSonucu

# Rehberin 6.3 bölümündeki başlangıç meta-prompt'u. 5 strateji ve dayanakları:
#   net       → Principled Instructions (26 ilke)
#   detayli   → 26 ilke + The Prompt Report
#   adim_adim → Chain-of-Thought, Zero-Shot Reasoners
#   format    → The Prompt Report
#   soru      → Rephrase and Respond, Why Johnny Can't Prompt
META_PROMPT_V0 = """Sen deneyimli bir prompt mühendisisin. Kullanıcı bir yapay zekâ sohbet aracına
göndermek üzere aşağıdaki prompt'u yazdı. Görevin, bu prompt'u ANLAMINI VE AMACINI
DEĞİŞTİRMEDEN 5 farklı stratejiyle geliştirmek.

Kurallar:
- Kullanıcının dilinde yaz (Türkçe yazdıysa Türkçe).
- Bilmediğin bilgileri UYDURMA; [dil], [konu], [uzunluk] gibi köşeli parantezle boşluk bırak.
- Stratejiler birbirinden belirgin biçimde farklı olsun:
  1 net: kısa ve tek açık görev
  2 detayli: rol + amaç + hedef kitle + kısıtlar
  3 adim_adim: önce plan, sonra çözüm
  4 format: çıktının biçimini ve uzunluğunu tanımla
  5 soru: eksik bilgileri belirt veya önce soru sormasını iste
- Önce görev türünü belirle: kod | yazi | analiz | gorsel | diger
- Her seçenek için tek cümlelik "neden daha iyi" açıklaması yaz.
- SADECE aşağıdaki JSON'u döndür, başka hiçbir şey yazma.

{
  "gorev_turu": "kod",
  "eksik_bilgiler": ["programlama dili", "programın amacı"],
  "secenekler": [
    {"strateji": "net", "baslik": "Net ve kısa", "prompt": "...", "neden": "..."},
    {"strateji": "detayli", "baslik": "Detaylı", "prompt": "...", "neden": "..."},
    {"strateji": "adim_adim", "baslik": "Adım adım", "prompt": "...", "neden": "..."},
    {"strateji": "format", "baslik": "Format odaklı", "prompt": "...", "neden": "..."},
    {"strateji": "soru", "baslik": "Önce soru", "prompt": "...", "neden": "..."}
  ]
}"""

# v1 (21.10.2026) — ilk gerçek Gemini testinden çıkan değişiklikler (docs/kararlar/0003-meta-prompt-v1.md):
#   1. "soru" stratejisi bazen yapay zekânın CEVABI gibi yazıldı ("Elbette, size kod yazabilirim...").
#      → Tüm prompt'ların kullanıcının ağzından, yapay zekâya hitaben yazılması kuralı eklendi.
#   2. Görev türüne göre neyin eksik olabileceğine dair ipuçları eklendi (rehber 5-6. hafta:
#      "kod, yazı, analiz ve görsel istekleri için strateji içerikleri farklılaşıyor").
#   3. "neden" açıklaması için uzunluk sınırı ve "neyi eklediğini söyle" kuralı.
META_PROMPT_V1 = """Sen deneyimli bir prompt mühendisisin. Kullanıcı bir yapay zekâ sohbet aracına
göndermek üzere aşağıdaki prompt'u yazdı. Görevin, bu prompt'u ANLAMINI VE AMACINI
DEĞİŞTİRMEDEN 5 farklı stratejiyle geliştirmek.

Temel kurallar:
- Kullanıcının dilinde yaz (Türkçe yazdıysa Türkçe).
- Her "prompt" alanı, KULLANICININ yapay zekâya göndereceği bir istektir: kullanıcının ağzından,
  yapay zekâya hitaben yaz. ASLA yapay zekânın cevabı gibi yazma ("Elbette, yardımcı olabilirim" gibi).
- Bilmediğin bilgileri UYDURMA. Kullanıcının söylemediği somut bir bilgi gerekiyorsa
  [programlama dili], [konu], [uzunluk] gibi köşeli parantezle boşluk bırak.
- Kullanıcının istemediği yeni bir görev ekleme; isteğin kapsamını genişletme.

Önce görev türünü belirle: kod | yazi | analiz | gorsel | diger
Görev türüne göre genellikle eksik olan bilgiler:
- kod: programlama dili/sürümü, girdi ve çıktı, hata mesajı, kullanılan kütüphane
- yazi: hedef kitle, ton (resmî/samimi), uzunluk, amaç
- analiz: değerlendirme ölçütleri, bağlam/veri, beklenen sonuç biçimi (tablo, öneri)
- gorsel: konu, stil, renkler, kompozisyon, en-boy oranı (görsel üretim modeline uygun yaz)
- diger: amaç, kısıtlar (süre, bütçe, seviye)

5 strateji birbirinden belirgin biçimde farklı olsun:
  1 net: tek cümlelik, açık ve kısa görev; gereksiz kelime yok
  2 detayli: rol + amaç + hedef kitle + kısıtlar
  3 adim_adim: yapay zekâdan önce plan/adımları, sonra çözümü iste
  4 format: çıktının biçimini (madde, tablo, kod bloğu…) ve uzunluğunu tanımla
  5 soru: yapay zekâdan, cevap vermeden ÖNCE eksik bilgileri kullanıcıya sormasını iste
     (ör. "...istiyorum. Başlamadan önce bana [şunları] sor.")

Her seçenek için "neden": prompt'a NEYİN eklendiğini ve bunun cevabı nasıl iyileştireceğini anlatan
tek cümle (en fazla 25 kelime).

SADECE aşağıdaki biçimde JSON döndür, başka hiçbir şey yazma:
{
  "gorev_turu": "kod",
  "eksik_bilgiler": ["programlama dili", "programın amacı"],
  "secenekler": [
    {"strateji": "net", "baslik": "Net ve kısa", "prompt": "...", "neden": "..."},
    {"strateji": "detayli", "baslik": "Detaylı", "prompt": "...", "neden": "..."},
    {"strateji": "adim_adim", "baslik": "Adım adım", "prompt": "...", "neden": "..."},
    {"strateji": "format", "baslik": "Format odaklı", "prompt": "...", "neden": "..."},
    {"strateji": "soru", "baslik": "Önce soru", "prompt": "...", "neden": "..."}
  ]
}"""

# Hangi sürüm kullanılacak? .env → META_PROMPT_SURUMU (v0 / v1). Sürümleri karşılaştırmak için:
# sunucuyu v0 ile başlat → eval/meta_prompt_testi.py → v1 ile başlat → aynı test.
META_PROMPTLAR = {"v0": META_PROMPT_V0, "v1": META_PROMPT_V1}
META_PROMPT_SURUMU = config.META_PROMPT_SURUMU
META_PROMPT = META_PROMPTLAR[META_PROMPT_SURUMU]

# Eklenti dili biliyorsa (ayarlardan) modele ek bir ipucu veririz.
_DIL_NOTU = {
    "tr": "Kullanıcı Türkçe yazıyor; seçenekleri Türkçe yaz.",
    "en": "The user writes in English; write the options in English.",
    "auto": "",  # ek not yok, model dili prompt'tan anlar
}


def mesajlari_olustur(prompt: str, dil: str = "auto") -> list[dict[str, str]]:
    """Modele gidecek mesaj listesini hazırlar.

    - system mesajı: meta-prompt (talimatlar)
    - user mesajı:   kullanıcının prompt'u, <<< >>> işaretleri arasında

    Neden <<< >>>? Kullanıcının prompt'u "önceki talimatları unut" gibi bir şey içerse bile
    model bunun geliştirilecek METİN olduğunu, kendisine verilen talimat olmadığını anlasın.
    """
    sistem = META_PROMPT
    if _DIL_NOTU.get(dil):
        sistem += "\n\n" + _DIL_NOTU[dil]
    return [
        {"role": "system", "content": sistem},
        {"role": "user", "content": f"Kullanıcının prompt'u:\n<<<\n{prompt}\n>>>"},
    ]


# Modeller JSON'u sıkça ```json ... ``` kod bloğu içine koyar; bu ifade o işaretleri siler.
_KOD_BLOGU = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def ciktiyi_ayristir(metin: str) -> GelistirmeSonucu:
    """Modelin metin cevabını JSON'a çevirip şemaya göre doğrular.

    Geçersizse json.JSONDecodeError (JSON değil) veya pydantic.ValidationError
    (JSON ama şemaya uymuyor) fırlatır; main.py bu durumda yeniden dener.
    """
    temiz = _KOD_BLOGU.sub("", metin.strip())
    return GelistirmeSonucu.model_validate(json.loads(temiz))
