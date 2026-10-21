"""Aday prompt'ları terminalde tek tek etiketlemek için yardımcı.

Kullanım:
    python scripts/data/etiketle.py data/raw/adaylar_wildchat.jsonl data/test_prompts/test_prompts_v2.jsonl

Her aday için görev türü ve belirsizlik sorulur. Kısayollar:
    görev türü : k=kod  y=yazi  a=analiz  g=gorsel  d=diger   s=atla   q=çık
    belirsizlik: 1=dusuk  2=orta  3=yuksek

Etiketlenenler çıktı dosyasının SONUNA eklenir ve id'ler kaldığı yerden devam eder;
yarıda bırakıp sonra devam edebilirsiniz (daha önce etiketlenen adaylar atlanır).

Etiketleme kuralları ve iki kişilik uyum kontrolü için: data/README.md
"""

import argparse
import json
import sys
from pathlib import Path

GOREV = {"k": "kod", "y": "yazi", "a": "analiz", "g": "gorsel", "d": "diger"}
BELIRSIZLIK = {"1": "dusuk", "2": "orta", "3": "yuksek"}


def sor(soru: str, secenekler: dict[str, str], ekstra: tuple[str, ...] = ()) -> str:
    while True:
        cevap = input(soru).strip().lower()
        if cevap in secenekler or cevap in ekstra:
            return cevap
        print("  Geçersiz tuş, tekrar deneyin.")


def main() -> None:
    # Windows konsolu (cp1254) Türkçe dışı karakterleri basamıyor; çıktıyı UTF-8 yap
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("adaylar", type=Path)
    ap.add_argument("cikti", type=Path)
    args = ap.parse_args()

    mevcut = []
    if args.cikti.exists():
        mevcut = [json.loads(s) for s in args.cikti.read_text(encoding="utf-8").splitlines() if s.strip()]
    etiketli = {m["prompt"] for m in mevcut}
    sonraki_no = max((int(m["id"].split("-")[1]) for m in mevcut), default=0) + 1

    adaylar = [json.loads(s) for s in args.adaylar.read_text(encoding="utf-8").splitlines() if s.strip()]
    with args.cikti.open("a", encoding="utf-8") as f:
        for aday in adaylar:
            if aday["prompt"] in etiketli:
                continue
            print("\n" + "─" * 60 + f"\n{aday['prompt']}\n" + "─" * 60)
            g = sor("Görev türü [k/y/a/g/d, s=atla, q=çık]: ", GOREV, ("s", "q"))
            if g == "q":
                break
            if g == "s":
                continue
            b = sor("Belirsizlik [1/2/3]: ", BELIRSIZLIK)
            not_ = input("Not (boş geçilebilir): ").strip()
            kayit = {
                "id": f"tp-{sonraki_no:04d}",
                "prompt": aday["prompt"],
                "gorev_turu": GOREV[g],
                "belirsizlik": BELIRSIZLIK[b],
                "kaynak": aday.get("kaynak", "ekip"),
                "not": not_,
            }
            f.write(json.dumps(kayit, ensure_ascii=False) + "\n")
            f.flush()  # Ctrl+C ile çıkılsa bile kaydedilmiş olsun
            sonraki_no += 1
    print(f"Kaydedildi → {args.cikti}")


if __name__ == "__main__":
    main()
