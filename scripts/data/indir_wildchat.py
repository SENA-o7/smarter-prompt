"""WildChat-1M'den Türkçe, ilk tur kullanıcı prompt'larını indirir.

Kullanım (repo kökünden):
    pip install -r scripts/requirements.txt
    python scripts/data/indir_wildchat.py --limit 5000

Çıktı: data/raw/wildchat_tr.jsonl  (data/raw/ .gitignore'da → GitHub'a GİTMEZ)

Neden ham veriyi repoya koymuyoruz? Büyük ve lisanslı. Bunun yerine bu betiği koyuyoruz;
herkes aynı betiği çalıştırınca aynı veriyi elde eder (tekrarlanabilirlik).

Lisans: WildChat-1M ODC-BY. Hugging Face'te veri setinin sayfasında koşulları kabul etmeniz
ve `huggingface-cli login` ile giriş yapmanız gerekebilir.
"""

import argparse
import json
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parents[2]
CIKTI = KOK / "data" / "raw" / "wildchat_tr.jsonl"


def main() -> None:
    # Windows konsolu (cp1254) Türkçe dışı karakterleri basamıyor; çıktıyı UTF-8 yap
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=5000, help="en fazla kaç Türkçe prompt toplanacak")
    args = ap.parse_args()

    from datasets import load_dataset  # büyük kütüphane, yalnızca gerekince yüklenir

    # streaming=True: 1 milyon sohbetin tamamını indirmeden satır satır okur
    veri = load_dataset("allenai/WildChat-1M", split="train", streaming=True)

    CIKTI.parent.mkdir(parents=True, exist_ok=True)
    sayi = 0
    with CIKTI.open("w", encoding="utf-8") as f:
        for satir in veri:
            if satir.get("language") != "Turkish":
                continue
            # Sohbetin ilk kullanıcı mesajı = kullanıcının ilk yazdığı prompt
            ilk = next((m for m in satir["conversation"] if m["role"] == "user"), None)
            if not ilk:
                continue
            kayit = {"kaynak_id": satir["conversation_hash"], "prompt": ilk["content"]}
            f.write(json.dumps(kayit, ensure_ascii=False) + "\n")
            sayi += 1
            if sayi % 500 == 0:
                print(f"{sayi} prompt toplandı...")
            if sayi >= args.limit:
                break

    print(f"Bitti: {sayi} prompt → {CIKTI}")


if __name__ == "__main__":
    main()
