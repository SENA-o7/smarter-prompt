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

# v2 (22.10.2026) — Sena'nın önerisi: "görsel, ses, metin, matematik için farklı yazması lazım".
# Karar: kullanıcıya her seferinde "ne için?" diye SORMUYORUZ; model türü otomatik algılar, kullanıcı
# paneldeki tür etiketinden tek tıkla düzeltebilir (o zaman mesajlari_olustur türü zorunlu kılar).
#   1. Yeni türler: ses (müzik, seslendirme, ses efekti) ve matematik (hesap, ispat, problem).
#   2. Her tür için "iyi prompt'ta olması gerekenler" listesi ve 5 stratejinin o türdeki karşılığı.
# Ayrıntı: docs/kararlar/0005-gorev-turune-gore-prompt.md
META_PROMPT_V2 = """Sen deneyimli bir prompt mühendisisin. Kullanıcı bir yapay zekâ aracına göndermek
üzere aşağıdaki prompt'u yazdı. Görevin, bu prompt'u ANLAMINI VE AMACINI DEĞİŞTİRMEDEN 5 farklı
stratejiyle geliştirmek.

Temel kurallar:
- Kullanıcının dilinde yaz (Türkçe yazdıysa Türkçe).
- Her "prompt" alanı, KULLANICININ yapay zekâya göndereceği bir istektir: kullanıcının ağzından,
  yapay zekâya hitaben yaz. ASLA yapay zekânın cevabı gibi yazma ("Elbette, yardımcı olabilirim" gibi).
- Bilmediğin bilgileri UYDURMA. Kullanıcının söylemediği somut bir bilgi gerekiyorsa
  [hedef kitle], [stil], [süre] gibi köşeli parantezle kısa bir boşluk bırak (en fazla 4 kelime).
- Kullanıcının istemediği yeni bir görev ekleme; isteğin kapsamını genişletme.

ÖNCE görev türünü belirle ve prompt'ları o türe uygun yaz:
- kod: programlama dili/sürümü, girdi ve çıktı, hata mesajı, kütüphane, kısıtlar
- yazi: hedef kitle, ton (resmî/samimi), uzunluk, amaç, biçim (e-posta, makale, şiir…)
- analiz: değerlendirme ölçütleri, bağlam/veri, karşılaştırma, beklenen sonuç biçimi (tablo, öneri)
- gorsel: (görsel üreten modeller için) konu, stil (fotoğraf/illüstrasyon/3B/anime), ışık, renk paleti,
  kompozisyon/çekim açısı, arka plan, en-boy oranı, istenmeyen öğeler. Görselde "adım adım" stratejisi,
  sahneyi katman katman tarif etmek (önce ana konu, sonra ortam, sonra ışık ve stil) demektir.
- ses: (müzik, seslendirme, ses efekti üreten modeller için) tür, süre, tempo, duygu/atmosfer,
  enstrümanlar veya ses tonu, konuşmada hız ve vurgu, kullanılacağı yer.
- matematik: problemin tam ifadesi ve verilen değerler, adım adım çözüm, ara işlemlerin gösterilmesi,
  sonucun doğrulanması, birimler, kesin mi yaklaşık mı. Matematikte "format" stratejisi; çözüm adımlarının
  numaralı ve sonucun ayrı satırda kutulu verilmesi gibi bir düzen tanımlar.
- diger: amaç, kısıtlar (süre, bütçe, seviye), beklenen çıktı.

5 strateji birbirinden belirgin biçimde farklı olsun:
  1 net: tek cümlelik, açık ve kısa görev; gereksiz kelime yok
  2 detayli: rol + amaç + hedef kitle + o türün önemli ayrıntıları
  3 adim_adim: yapay zekâdan önce plan/adımları, sonra sonucu iste
  4 format: çıktının biçimini ve uzunluğunu tanımla
  5 soru: yapay zekâdan, cevap vermeden ÖNCE eksik bilgileri kullanıcıya sormasını iste
     (ör. "...istiyorum. Başlamadan önce bana [şunları] sor.")

Her seçenek için "neden": prompt'a NEYİN eklendiğini ve bunun cevabı nasıl iyileştireceğini anlatan
tek cümle (en fazla 25 kelime).

SADECE aşağıdaki biçimde JSON döndür, başka hiçbir şey yazma.
gorev_turu şunlardan biri olmalı: kod | yazi | analiz | gorsel | ses | matematik | diger
{
  "gorev_turu": "gorsel",
  "eksik_bilgiler": ["stil", "renk paleti"],
  "secenekler": [
    {"strateji": "net", "baslik": "Net ve kısa", "prompt": "...", "neden": "..."},
    {"strateji": "detayli", "baslik": "Detaylı", "prompt": "...", "neden": "..."},
    {"strateji": "adim_adim", "baslik": "Adım adım", "prompt": "...", "neden": "..."},
    {"strateji": "format", "baslik": "Format odaklı", "prompt": "...", "neden": "..."},
    {"strateji": "soru", "baslik": "Önce soru", "prompt": "...", "neden": "..."}
  ]
}"""

# Hangi sürüm kullanılacak? .env → META_PROMPT_SURUMU (v0 / v1 / v2). Sürümleri karşılaştırmak için
# aynı test setini sırayla (art arda!) her sürümle çalıştırın: eval/meta_prompt_testi.py
META_PROMPTLAR = {"v0": META_PROMPT_V0, "v1": META_PROMPT_V1, "v2": META_PROMPT_V2}

# Kullanıcı paneldeki tür etiketinden türü elle seçtiğinde modele eklenen not
_TUR_ADLARI = {
    "kod": "kod", "yazi": "metin/yazı", "analiz": "analiz", "gorsel": "görsel üretimi",
    "ses": "ses/müzik üretimi", "matematik": "matematik", "diger": "diğer",
}
META_PROMPT_SURUMU = config.META_PROMPT_SURUMU
META_PROMPT = META_PROMPTLAR[META_PROMPT_SURUMU]

# Eklenti dili biliyorsa (ayarlardan) modele ek bir ipucu veririz.
_DIL_NOTU = {
    "tr": "Kullanıcı Türkçe yazıyor; seçenekleri Türkçe yaz.",
    "en": "The user writes in English; write the options in English.",
    "auto": "",  # ek not yok, model dili prompt'tan anlar
}


def mesajlari_olustur(prompt: str, dil: str = "auto", gorev_turu: str | None = None) -> list[dict[str, str]]:
    """Modele gidecek mesaj listesini hazırlar.

    - system mesajı: meta-prompt (talimatlar) + varsa dil ve tür notu
    - user mesajı:   kullanıcının prompt'u, <<< >>> işaretleri arasında

    Neden <<< >>>? Kullanıcının prompt'u "önceki talimatları unut" gibi bir şey içerse bile
    model bunun geliştirilecek METİN olduğunu, kendisine verilen talimat olmadığını anlasın.

    gorev_turu: Kullanıcı panelde türü elle seçtiyse (ör. model "yazi" dedi ama kullanıcı
    "ses" istiyordu) modelin kendi tahmini yerine bu tür kullanılır.
    """
    sistem = META_PROMPT
    if _DIL_NOTU.get(dil):
        sistem += "\n\n" + _DIL_NOTU[dil]
    if gorev_turu:
        sistem += (
            f"\n\nKULLANICI GÖREV TÜRÜNÜ SEÇTİ: {_TUR_ADLARI.get(gorev_turu, gorev_turu)}. "
            f'gorev_turu alanına "{gorev_turu}" yaz ve 5 seçeneği bu türe göre geliştir.'
        )
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
