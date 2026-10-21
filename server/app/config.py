"""Ayarlar: tüm değerler ortam değişkenlerinden (server/.env dosyasından) okunur.

API anahtarları ASLA koda yazılmaz. .env dosyası .gitignore'da olduğu için GitHub'a gitmez;
ekip arkadaşları kendi .env dosyalarını .env.example'dan kopyalayarak oluşturur.
"""

import os

from dotenv import load_dotenv

load_dotenv()  # server/.env dosyasını okuyup ortam değişkenlerine yükler

# Kullanılacak model (LiteLLM formatı: sağlayıcı/model). Ayrıntı: providers.py
MODEL = os.getenv("MODEL", "gemini/gemini-2.5-flash")

# IP başına istek sınırı (slowapi formatı: "20/minute", "100/hour" ...)
HIZ_SINIRI = os.getenv("HIZ_SINIRI", "20/minute")

# Hangi kaynaklardan (origin) gelen isteklere izin verilir? Varsayılan: Chrome ve Firefox eklentileri.
IZINLI_KAYNAK_REGEX = os.getenv("IZINLI_KAYNAK_REGEX", r"^(chrome|moz)-extension://.*$")
