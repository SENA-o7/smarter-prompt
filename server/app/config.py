"""Ayarlar: tüm değerler ortam değişkenlerinden (server/.env dosyasından) okunur.

API anahtarları ASLA koda yazılmaz. .env dosyası .gitignore'da olduğu için GitHub'a gitmez;
ekip arkadaşları kendi .env dosyalarını .env.example'dan kopyalayarak oluşturur.
"""

import os

from dotenv import load_dotenv

load_dotenv()  # server/.env dosyasını okuyup ortam değişkenlerine yükler

# Kullanılacak model (LiteLLM formatı: sağlayıcı/model). Ayrıntı: providers.py
MODEL = os.getenv("MODEL", "gemini/gemini-3.5-flash-lite")

# Hangi meta-prompt sürümü kullanılsın? (app/meta_prompt.py → META_PROMPTLAR)
META_PROMPT_SURUMU = os.getenv("META_PROMPT_SURUMU", "v2")

# Modelin "düşünme" (reasoning) seviyesi: disable | low | medium | high.
# disable = en hızlı. Desteklemeyen modellerde LiteLLM bu ayarı yok sayar.
DUSUNME = os.getenv("DUSUNME", "disable")

# Anonim seçim kayıtlarının yazılacağı dosya (JSONL, satır başına bir olay). git'e girmez.
OLAY_DOSYASI = os.getenv("OLAY_DOSYASI", "veri/olaylar.jsonl")

# Kullanıcı geri bildirimleri (👍/👎 + not). git'e girmez. Analiz: eval/kullanici_calismasi.py
GERI_BILDIRIM_DOSYASI = os.getenv("GERI_BILDIRIM_DOSYASI", "veri/geri_bildirim.jsonl")

# IP başına istek sınırı (slowapi formatı: "20/minute", "100/hour" ...)
HIZ_SINIRI = os.getenv("HIZ_SINIRI", "20/minute")

# Hangi kaynaklardan (origin) gelen isteklere izin verilir? Varsayılan: Chrome ve Firefox eklentileri.
IZINLI_KAYNAK_REGEX = os.getenv("IZINLI_KAYNAK_REGEX", r"^(chrome|moz)-extension://.*$")
