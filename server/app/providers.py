"""Model katmanı: LiteLLM ile sağlayıcıdan bağımsız model çağrısı.

LiteLLM ne işe yarar? OpenAI, Gemini, Anthropic, Ollama gibi farklı sağlayıcıları TEK bir
fonksiyonla çağırmamızı sağlar. Model değiştirmek için kod değil, yalnızca .env'deki
MODEL değişkenini değiştirmek yeterli. Örnekler:

    MODEL=gemini/gemini-2.5-flash      → GEMINI_API_KEY gerekir
    MODEL=openai/gpt-4o-mini           → OPENAI_API_KEY gerekir
    MODEL=anthropic/claude-haiku-4-5   → ANTHROPIC_API_KEY gerekir
    MODEL=ollama/llama3.1              → yerel, ücretsiz, anahtar gerekmez (Ollama kurulu olmalı)
"""

from typing import Protocol


class LLM(Protocol):
    """Model fonksiyonunun "şekli": mesaj listesi ve model adı alır, metin döndürür.

    Gerçek fonksiyon (litellm_tamamla) ve testlerdeki sahte fonksiyon bu şekle uyar.
    """

    async def __call__(self, mesajlar: list[dict[str, str]], model: str) -> str: ...


async def litellm_tamamla(mesajlar: list[dict[str, str]], model: str) -> str:
    """Modeli LiteLLM üzerinden çağırır ve cevabın metnini döndürür."""
    # litellm büyük bir kütüphane; burada içe aktarıyoruz ki testler onu yüklemek zorunda kalmasın.
    import litellm

    cevap = await litellm.acompletion(
        model=model,
        messages=mesajlar,
        temperature=0.7,  # biraz çeşitlilik: 5 seçenek birbirine çok benzemesin
        response_format={"type": "json_object"},  # destekleyen modellere "sadece JSON üret" der
        drop_params=True,  # desteklemeyen sağlayıcılarda response_format sessizce atlanır
        timeout=30,  # 30 sn'de cevap gelmezse hata → main.py 503 döner
    )
    return cevap.choices[0].message.content or ""
