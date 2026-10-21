"""Meta-prompt'u test setiyle ölçer (2. hafta "20 prompt'ta geçerli JSON" hedefi).

Çalışan sunucuya (/enhance) test setindeki her prompt'u gönderir ve şunları ölçer:
  - Şema geçerliliği: kaç istekte geçerli JSON + tam 5 seçenek geldi (hedef ≥ %98)
  - Gecikme: medyan ve %95'lik süre (hedef: medyan < 4 sn)
  - Görev türü uyumu: modelin bulduğu görev türü bizim etiketimizle aynı mı

Kullanım (önce sunucuyu başlatın: cd server && uvicorn app.main:app --port 8000):
    python eval/meta_prompt_testi.py                               # v0 setindeki 20 prompt
    python eval/meta_prompt_testi.py --set data/test_prompts/test_prompts_v1.jsonl --limit 100

Çıktılar:
    eval/results/ham/meta_prompt_<surum>_<tarih>.jsonl   → tüm cevaplar (git'e girmez)
    eval/results/meta_prompt_<surum>_<tarih>.csv         → satır başına özet (repoya girer)
    Terminalde özet tablo (rapora / günlüğe kopyalanabilir)

Not: Sunucunun hız sınırı varsayılan 20/dk. 100 prompt için .env'de HIZ_SINIRI=200/minute yapın.
"""

import argparse
import csv
import json
import statistics
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

KOK = Path(__file__).resolve().parents[1]


def yuzdelik(degerler: list[float], p: float) -> float:
    s = sorted(degerler)
    return s[min(len(s) - 1, round(p / 100 * (len(s) - 1)))]


def main() -> None:
    # Windows konsolu (cp1254) Türkçe dışı karakterleri basamıyor; çıktıyı UTF-8 yap
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", type=Path, default=KOK / "data/test_prompts/test_prompts_v0.jsonl")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--url", default="http://localhost:8000")
    args = ap.parse_args()

    promptlar = [json.loads(s) for s in args.set.read_text(encoding="utf-8").splitlines() if s.strip()]
    promptlar = promptlar[: args.limit]

    satirlar, ham = [], []
    with httpx.Client(base_url=args.url, timeout=60) as istemci:
        surum = istemci.get("/health").json()["meta_prompt"]
        for i, tp in enumerate(promptlar, 1):
            # 429 = sunucunun hız sınırı doldu. Bu bir meta-prompt hatası değil; bekleyip tekrar dene.
            for _ in range(10):
                t0 = time.perf_counter()
                r = istemci.post("/enhance", json={"prompt": tp["prompt"]})
                sure = (time.perf_counter() - t0) * 1000
                if r.status_code != 429:
                    break
                print("  hız sınırı (429), 10 sn bekleniyor...")
                time.sleep(10)
            govde = r.json()
            gecerli = r.status_code == 200
            satirlar.append({
                "id": tp["id"],
                "prompt": tp["prompt"],
                "durum": r.status_code,
                "gecerli": gecerli,
                "sure_ms": round(sure),
                "etiket_gorev": tp["gorev_turu"],
                "model_gorev": govde.get("gorev_turu", "") if gecerli else "",
                "eksik_bilgi_sayisi": len(govde.get("eksik_bilgiler", [])) if gecerli else "",
            })
            ham.append({"id": tp["id"], "durum": r.status_code, "cevap": govde})
            print(f"[{i:3}/{len(promptlar)}] {r.status_code} {sure:6.0f} ms  {tp['prompt'][:50]}")

    # --- Kaydet ---
    damga = datetime.now().strftime("%Y%m%d-%H%M")
    (KOK / "eval/results/ham").mkdir(parents=True, exist_ok=True)
    ham_yol = KOK / f"eval/results/ham/meta_prompt_{surum}_{damga}.jsonl"
    ham_yol.write_text("\n".join(json.dumps(h, ensure_ascii=False) for h in ham), encoding="utf-8")
    csv_yol = KOK / f"eval/results/meta_prompt_{surum}_{damga}.csv"
    with csv_yol.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(satirlar[0]))
        w.writeheader()
        w.writerows(satirlar)

    # --- Özet ---
    n = len(satirlar)
    gecerliler = [s for s in satirlar if s["gecerli"]]
    sureler = [s["sure_ms"] for s in gecerliler]
    uyum = sum(s["etiket_gorev"] == s["model_gorev"] for s in gecerliler)
    print("\n=== Özet ===")
    print(f"Meta-prompt sürümü : {surum}")
    print(f"Şema geçerliliği   : %{100 * len(gecerliler) / n:.0f} (n = {n})  [hedef ≥ %98]")
    if sureler:
        print(f"Gecikme            : medyan {statistics.median(sureler) / 1000:.1f} sn, "
              f"p95 {yuzdelik(sureler, 95) / 1000:.1f} sn  [hedef: medyan < 4 sn]")
        print(f"Görev türü uyumu   : %{100 * uyum / len(gecerliler):.0f} (n = {len(gecerliler)})")
    print(f"CSV                : {csv_yol.relative_to(KOK)}")


if __name__ == "__main__":
    main()
