"""Ham prompt'ları test setine uygun adaylara indirger.

Kullanım:
    python scripts/data/filtrele_turkce.py data/raw/wildchat_tr.jsonl --kaynak wildchat

Çıktı: data/raw/adaylar_<kaynak>.jsonl  (hâlâ ham sayılır, repoya girmez)

Filtreler (sırayla):
  1. Uzunluk: Projemiz KISA ve belirsiz prompt'larla ilgili → 2-40 kelime arası.
  2. Kişisel bilgi (KVKK): e-posta, telefon, TC kimlik no, IBAN içerenler ATILIR.
     (Maskelemek yerine atıyoruz; elimizde fazlasıyla aday var, risk almaya gerek yok.)
  3. Tekrar: Küçük harfe çevrilip boşlukları sadeleştirilmiş hâli aynı olanlar tek sayılır.
  4. Kod bloğu / uzun yapıştırmalar: ``` içeren veya çok satırlı olanlar atılır.

Bu betik yalnızca ADAY üretir. Son seçim ve etiketleme elle yapılır (etiketle.py).
"""

import argparse
import json
import re
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parents[2]

KISISEL_BILGI = [
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),  # e-posta
    re.compile(r"(\+?90[\s-]?)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}"),  # TR cep telefonu
    re.compile(r"\b[1-9]\d{10}\b"),  # TC kimlik no (11 hane)
    re.compile(r"\bTR\d{2}[\s\d]{20,}", re.IGNORECASE),  # IBAN
]


def kisisel_bilgi_var(metin: str) -> bool:
    return any(d.search(metin) for d in KISISEL_BILGI)


def normalize(metin: str) -> str:
    return re.sub(r"\s+", " ", metin.lower()).strip()


def uygun_mu(metin: str, min_kelime: int, max_kelime: int) -> bool:
    kelime = len(metin.split())
    if not (min_kelime <= kelime <= max_kelime):
        return False
    if "```" in metin or metin.count("\n") > 2:
        return False
    return not kisisel_bilgi_var(metin)


def main() -> None:
    # Windows konsolu (cp1254) Türkçe dışı karakterleri basamıyor; çıktıyı UTF-8 yap
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("girdi", type=Path)
    ap.add_argument("--kaynak", default="wildchat")
    ap.add_argument("--min-kelime", type=int, default=2)
    ap.add_argument("--max-kelime", type=int, default=40)
    args = ap.parse_args()

    gorulen: set[str] = set()
    adaylar = []
    toplam = 0
    with args.girdi.open(encoding="utf-8") as f:
        for satir in f:
            toplam += 1
            kayit = json.loads(satir)
            metin = kayit["prompt"].strip()
            anahtar = normalize(metin)
            if anahtar in gorulen or not uygun_mu(metin, args.min_kelime, args.max_kelime):
                continue
            gorulen.add(anahtar)
            adaylar.append({**kayit, "prompt": metin, "kaynak": args.kaynak})

    cikti = KOK / "data" / "raw" / f"adaylar_{args.kaynak}.jsonl"
    with cikti.open("w", encoding="utf-8") as f:
        for a in adaylar:
            f.write(json.dumps(a, ensure_ascii=False) + "\n")
    print(f"{toplam} satırdan {len(adaylar)} aday kaldı → {cikti}")


if __name__ == "__main__":
    main()
