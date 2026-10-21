"""Smarter Prompt sunucusu (FastAPI).

Görevi: Eklentiden gelen kısa prompt'u meta-prompt ile birlikte modele göndermek,
modelin döndürdüğü JSON'u doğrulamak ve 5 seçeneği eklentiye geri vermek.

Uç noktalar:
    GET  /health   → Sunucu ayakta mı, hangi model ve meta-prompt sürümü kullanılıyor?
    POST /enhance  → {"prompt": "bana kod yaz"} alır, 5 geliştirilmiş seçenek döndürür.

Çalıştırma:  uvicorn app.main:app --reload --port 8000
Belgeler:    http://localhost:8000/docs  (FastAPI otomatik üretir, buradan deneyebilirsiniz)
"""

import json
import logging
import time
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from . import config
from .meta_prompt import META_PROMPT_SURUMU, ciktiyi_ayristir, mesajlari_olustur
from .providers import LLM, litellm_tamamla
from .schemas import EnhanceRequest, EnhanceResponse

log = logging.getLogger("smarter_prompt")

# --- Hız sınırı -------------------------------------------------------------
# Aynı IP'den dakikada en fazla HIZ_SINIRI kadar istek kabul edilir (varsayılan 20/dk).
# Amaç: kötüye kullanımı ve API faturasının şişmesini önlemek. Sınır aşılırsa 429 döner.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Smarter Prompt API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS -------------------------------------------------------------------
# Tarayıcı, başka bir kaynaktan (origin) gelen isteklere varsayılan olarak izin vermez.
# Eklentinin arka plan betiği "chrome-extension://<id>" kaynağından istek attığı için
# yalnızca eklenti kaynaklarına izin veriyoruz; rastgele web siteleri sunucumuzu kullanamaz.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=config.IZINLI_KAYNAK_REGEX,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Model bozuk JSON döndürürse toplam kaç kez deneriz? 2 = ilk deneme + 1 yeniden deneme.
DENEME_SAYISI = 2


def get_llm() -> LLM:
    """Hangi model fonksiyonunun kullanılacağını FastAPI'ye söyler.

    Neden ayrı bir fonksiyon? Testlerde bunu `app.dependency_overrides` ile sahte bir
    modelle değiştiriyoruz; böylece testler gerçek API'ye gitmez, anahtar ve para gerekmez.
    """
    return litellm_tamamla


@app.get("/health")
def health() -> dict[str, str]:
    """Sağlık kontrolü: eklenti ve CI, sunucunun ayakta olduğunu buradan anlar."""
    return {"durum": "ok", "model": config.MODEL, "meta_prompt": META_PROMPT_SURUMU}


@app.post("/enhance", response_model=EnhanceResponse)
@limiter.limit(config.HIZ_SINIRI)
async def enhance(
    request: Request,  # slowapi, IP adresini bulmak için bu parametreyi ister
    govde: EnhanceRequest,  # FastAPI gövdeyi otomatik doğrular; boş prompt gelirse 422 döner
    llm: Annotated[LLM, Depends(get_llm)],
) -> EnhanceResponse:
    """Kullanıcının prompt'unu 5 stratejiyle geliştirir.

    Akış:
        1. Meta-prompt + kullanıcı prompt'u ile mesaj listesi oluşturulur.
        2. Model çağrılır.
        3. Cevap JSON olarak ayrıştırılır ve şemaya göre doğrulanır.
        4. Bozuksa bir kez daha denenir; yine bozuksa 502 döner.
    """
    baslangic = time.perf_counter()
    mesajlar = mesajlari_olustur(govde.prompt, govde.dil)

    son_hata: Exception | None = None
    for deneme in range(1, DENEME_SAYISI + 1):
        # 1) Modeli çağır. Ağ, anahtar veya kota hatası olursa yeniden denemenin anlamı yok → 503.
        try:
            metin = await llm(mesajlar, config.MODEL)
        except Exception as e:
            log.exception("Model çağrısı başarısız")
            raise HTTPException(503, "Model şu an yanıt vermiyor, biraz sonra tekrar deneyin.") from e

        # 2) Cevabı doğrula. Model bazen JSON dışında metin ekler veya 4 seçenek döndürür;
        #    bu durumda bir kez daha deneriz (modeller her seferinde farklı cevap üretir).
        try:
            sonuc = ciktiyi_ayristir(metin)
            break  # geçerli cevap geldi, döngüden çık
        except (json.JSONDecodeError, ValidationError) as e:
            log.warning("Geçersiz model çıktısı (deneme %d): %s", deneme, e)
            son_hata = e
    else:
        # for döngüsü break olmadan bittiyse: hiçbir deneme geçerli cevap üretemedi
        raise HTTPException(502, "Model geçerli bir cevap üretemedi, tekrar deneyin.") from son_hata

    # 3) Cevaba ölçüm için ek bilgiler ekle: hangi model, hangi meta-prompt sürümü, kaç ms sürdü.
    #    Bu alanlar değerlendirmede (eval/) gecikme ve sürüm karşılaştırması için kullanılır.
    return EnhanceResponse(
        **sonuc.model_dump(),
        model=config.MODEL,
        meta_prompt_surumu=META_PROMPT_SURUMU,
        sure_ms=round((time.perf_counter() - baslangic) * 1000),
    )
