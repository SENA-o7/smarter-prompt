"""Eklenti ile sunucu arasındaki JSON sözleşmesi (Pydantic modelleri).

ÖNEMLİ KURAL: Bu dosya değişirse extension/lib/schema.ts de AYNI PR'da güncellenmelidir.
Aksi halde eklenti sunucunun cevabını "beklenmeyen cevap" diye reddeder.
(Ayrıntı: docs/kararlar/0002-json-semasi.md)

Pydantic ne işe yarar? Gelen/giden veriyi tiplere göre otomatik kontrol eder.
Örneğin model 4 seçenek döndürürse veya "strateji" alanına bilinmeyen bir değer yazarsa
ValidationError fırlatılır ve sunucu yeniden dener.
"""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

# Literal: alan yalnızca bu değerlerden birini alabilir, başka bir şey gelirse hata verir.
GorevTuru = Literal["kod", "yazi", "analiz", "gorsel", "diger"]
Strateji = Literal["net", "detayli", "adim_adim", "format", "soru"]

# Kartların panelde gösterileceği sabit sıra (model karışık sırada döndürse bile).
STRATEJI_SIRASI: tuple[Strateji, ...] = ("net", "detayli", "adim_adim", "format", "soru")


class Secenek(BaseModel):
    """Paneldeki tek bir kart."""

    strateji: Strateji  # hangi strateji ile üretildi
    baslik: str = Field(min_length=1)  # kartın başlığı, ör. "Adım adım"
    prompt: str = Field(min_length=1)  # geliştirilmiş prompt metni (kutuya yazılacak olan)
    neden: str = Field(min_length=1)  # tek cümlelik "neden daha iyi" açıklaması


class GelistirmeSonucu(BaseModel):
    """Modelin döndürmesi gereken çıktı (meta-prompt'ta tarif edilen JSON)."""

    gorev_turu: GorevTuru
    eksik_bilgiler: list[str] = Field(default_factory=list)  # ör. ["programlama dili"]
    secenekler: list[Secenek] = Field(min_length=5, max_length=5)  # TAM 5 seçenek

    @model_validator(mode="after")
    def her_strateji_bir_kez(self) -> "GelistirmeSonucu":
        """5 seçenek var ama ikisi "net" olabilir; bunu da yakalıyoruz.

        Kontrol geçerse seçenekleri sabit sıraya dizeriz ki kullanıcı kartları
        her seferinde aynı yerde görsün.
        """
        stratejiler = {s.strateji for s in self.secenekler}
        if stratejiler != set(STRATEJI_SIRASI):
            raise ValueError("5 stratejinin her biri tam bir kez bulunmalı")
        self.secenekler.sort(key=lambda s: STRATEJI_SIRASI.index(s.strateji))
        return self


class EnhanceRequest(BaseModel):
    """Eklentinin /enhance'e gönderdiği istek gövdesi."""

    prompt: str = Field(min_length=1, max_length=4000)  # çok uzun metinler maliyeti artırır
    dil: Literal["tr", "en", "auto"] = "auto"  # auto: model dili kendisi algılar
    site: Literal["chatgpt", "claude", "gemini", "diger"] = "diger"  # istatistik için


class EnhanceResponse(GelistirmeSonucu):
    """/enhance cevabı = model çıktısı + ölçüm bilgileri."""

    model: str  # hangi model kullanıldı (ör. gemini/gemini-2.5-flash)
    meta_prompt_surumu: str  # v0, v1, ... (deneylerde sürüm karşılaştırması için)
    sure_ms: int  # geliştirme kaç milisaniye sürdü (hedef: medyan < 4000)
