"""LLM hakem değerlendirmesi (7. hafta; AS1, AS2, AS4).

Soru: Geliştirilmiş prompt'lar orijinal kısa prompt'tan DAHA İYİ CEVAP getiriyor mu?

Yöntem (rehber 8.1):
  1. Her test prompt'u için sunucudan 5 seçenek alınır (/enhance).
  2. Orijinal + 5 seçenek aynı HEDEF modele sorulur → 6 cevap.
  3. HAKEM model orijinalin cevabını her seçeneğin cevabıyla karşılaştırır.
  4. Her karşılaştırma İKİ SIRAYLA yapılır (A-B ve B-A). Sadece iki sırada da aynı taraf
     kazanırsa "kazandi/kaybetti"; aksi halde "berabere". (Sıra yanlılığına karşı, makale 14.)
  5. Hakem ayrıca niyet korunmasını (1-5) ve uydurma olup olmadığını puanlar (AS4).
  6. Hakem, geliştirici modelden FARKLI bir aileden seçilmelidir (kendini kayırma yanlılığı).

Kullanım (sunucu açıkken, server/.venv içinden; litellm orada kurulu):
    python eval/judge.py --set data/test_prompts/test_prompts_v1.jsonl --limit 10 \\
        --hedef gemini/gemini-2.5-flash-lite --hakem openai/gpt-4o-mini

Anahtarlar ortam değişkenlerinden okunur (server/.env yüklenir): GEMINI_API_KEY, OPENAI_API_KEY ...

Maliyet / süre: prompt başına 1 geliştirme + 6 hedef cevabı + 10 hakem çağrısı (5 seçenek × 2 sıra)
+ 5 niyet puanı = 22 çağrı. Ücretsiz Gemini (5 istek/dk) ile 200 prompt ~15 saat sürer →
önce --limit 10 ile deneyin. Betik kaldığı yerden devam eder (ara sonuçlar önbellekte).

Çıktı:
    eval/results/ham/judge_cache.jsonl   → tüm model çağrıları (önbellek, git'e girmez)
    eval/results/judge_<tarih>.csv       → karşılaştırma başına bir satır (repoya girer)
    Analiz: python eval/analiz.py eval/results/judge_<tarih>.csv
"""

import argparse
import asyncio
import csv
import hashlib
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

KOK = Path(__file__).resolve().parents[1]
ONBELLEK = KOK / "eval/results/ham/judge_cache.jsonl"

HAKEM_KARSILASTIRMA = """Bir kullanıcı yapay zekâya bir istek gönderdi. Aşağıda aynı isteğe verilmiş iki cevap var.
Kullanıcının ASIL isteği: <<<{orijinal}>>>

Cevap A:
<<<{a}>>>

Cevap B:
<<<{b}>>>

Hangi cevap kullanıcının asıl isteğini daha iyi karşılıyor? Uzunluğa değil, yararlılığa,
doğruluğa ve isteğe uygunluğa bak. SADECE şu JSON'u döndür: {{"kazanan": "A" | "B" | "berabere"}}"""

HAKEM_NIYET = """Kullanıcının orijinal prompt'u: <<<{orijinal}>>>
Geliştirilmiş prompt: <<<{gelistirilmis}>>>

1) Geliştirilmiş prompt, kullanıcının istediğiyle AYNI şeyi mi istiyor? 1 (tamamen farklı) - 5 (birebir aynı amaç)
2) Geliştirilmiş prompt, orijinalde olmayan SOMUT bir bilgi uydurmuş mu? (ör. kullanıcı dil belirtmemişken
   "Python ile" demek uydurmadır; "[programlama dili]" gibi boşluk bırakmak uydurma DEĞİLDİR)
SADECE şu JSON'u döndür: {{"niyet": 1-5, "uydurma": true | false}}"""


def onbellek_yukle() -> dict[str, str]:
    if not ONBELLEK.exists():
        return {}
    kayitlar = {}
    for satir in ONBELLEK.read_text(encoding="utf-8").splitlines():
        if satir.strip():
            k = json.loads(satir)
            kayitlar[k["anahtar"]] = k["cevap"]
    return kayitlar


class Cagirici:
    """Model çağrılarını önbellekli ve aralıklı yapar (kota dostu, kaldığı yerden devam)."""

    def __init__(self, bekle: float):
        self.bekle = bekle
        self.onbellek = onbellek_yukle()
        ONBELLEK.parent.mkdir(parents=True, exist_ok=True)
        self.son_cagri = 0.0

    async def __call__(self, model: str, mesaj: str, json_mu: bool = False) -> str:
        anahtar = hashlib.sha256(f"{model}|{json_mu}|{mesaj}".encode()).hexdigest()
        if anahtar in self.onbellek:
            return self.onbellek[anahtar]
        import litellm

        for deneme in range(6):
            kalan = self.bekle - (time.monotonic() - self.son_cagri)
            if kalan > 0:
                await asyncio.sleep(kalan)
            self.son_cagri = time.monotonic()
            try:
                r = await litellm.acompletion(
                    model=model,
                    messages=[{"role": "user", "content": mesaj}],
                    temperature=0,  # değerlendirmede tekrarlanabilirlik için
                    response_format={"type": "json_object"} if json_mu else None,
                    reasoning_effort="disable",
                    drop_params=True,
                    timeout=60,
                )
                cevap = r.choices[0].message.content or ""
                break
            except Exception as e:  # kota (429) veya geçici hata: bekle ve tekrar dene
                print(f"  model hatası ({type(e).__name__}), {20 * (deneme + 1)} sn bekleniyor...")
                await asyncio.sleep(20 * (deneme + 1))
        else:
            raise RuntimeError(f"{model} 6 denemede cevap vermedi")

        self.onbellek[anahtar] = cevap
        with ONBELLEK.open("a", encoding="utf-8") as f:
            f.write(json.dumps({"anahtar": anahtar, "cevap": cevap}, ensure_ascii=False) + "\n")
        return cevap


def json_oku(metin: str) -> dict:
    metin = metin.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
    try:
        return json.loads(metin)
    except json.JSONDecodeError:
        return {}


async def sirali_karsilastir(cagir, hakem, orijinal, cevap_orj, cevap_yeni) -> str:
    """İki sırada karşılaştırır. Dönüş: kazandi / kaybetti / berabere (geliştirilmiş prompt açısından)."""
    # Sıra 1: A = orijinal, B = geliştirilmiş
    k1 = json_oku(await cagir(hakem, HAKEM_KARSILASTIRMA.format(orijinal=orijinal, a=cevap_orj, b=cevap_yeni), True))
    # Sıra 2: A = geliştirilmiş, B = orijinal
    k2 = json_oku(await cagir(hakem, HAKEM_KARSILASTIRMA.format(orijinal=orijinal, a=cevap_yeni, b=cevap_orj), True))
    yeni_kazandi = k1.get("kazanan") == "B" and k2.get("kazanan") == "A"
    orj_kazandi = k1.get("kazanan") == "A" and k2.get("kazanan") == "B"
    return "kazandi" if yeni_kazandi else "kaybetti" if orj_kazandi else "berabere"


async def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(KOK / "server/.env")
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", type=Path, default=KOK / "data/test_prompts/test_prompts_v1.jsonl")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--hedef", default="gemini/gemini-2.5-flash-lite", help="cevapları üreten model")
    ap.add_argument("--hakem", default="openai/gpt-4o-mini", help="karşılaştıran model (FARKLI aile)")
    ap.add_argument("--bekle", type=float, default=13, help="model çağrıları arası saniye")
    args = ap.parse_args()

    if args.hakem.split("/")[0] == "gemini":
        print("UYARI: Hakem geliştiriciyle aynı aileden (Gemini). Kendini kayırma yanlılığı olabilir;"
              " sonuçları raporda bu kısıtla verin.")

    cagir = Cagirici(args.bekle)
    promptlar = [json.loads(s) for s in args.set.read_text(encoding="utf-8").splitlines() if s.strip()]
    promptlar = promptlar[: args.limit]
    satirlar = []

    async with httpx.AsyncClient(base_url=args.url, timeout=120) as istemci:
        for i, tp in enumerate(promptlar, 1):
            print(f"[{i}/{len(promptlar)}] {tp['prompt']}")
            r = await istemci.post("/enhance", json={"prompt": tp["prompt"]})
            if r.status_code != 200:
                print(f"  /enhance {r.status_code}, atlandı")
                continue
            gelistirme = r.json()
            cevap_orj = await cagir(args.hedef, tp["prompt"])
            for s in gelistirme["secenekler"]:
                cevap_yeni = await cagir(args.hedef, s["prompt"])
                karar = await sirali_karsilastir(cagir, args.hakem, tp["prompt"], cevap_orj, cevap_yeni)
                niyet = json_oku(await cagir(
                    args.hakem, HAKEM_NIYET.format(orijinal=tp["prompt"], gelistirilmis=s["prompt"]), True
                ))
                satirlar.append({
                    "id": tp["id"],
                    "gorev_turu": tp["gorev_turu"],
                    "belirsizlik": tp["belirsizlik"],
                    "strateji": s["strateji"],
                    "karar": karar,
                    "niyet": niyet.get("niyet", ""),
                    "uydurma": niyet.get("uydurma", ""),
                    "meta_prompt_surumu": gelistirme["meta_prompt_surumu"],
                    "hedef": args.hedef,
                    "hakem": args.hakem,
                })
                print(f"  {s['strateji']:10} → {karar:9} niyet={niyet.get('niyet', '?')}")

    if not satirlar:
        print("Hiç sonuç yok.")
        return
    yol = KOK / f"eval/results/judge_{datetime.now():%Y%m%d-%H%M}.csv"
    with yol.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(satirlar[0]))
        w.writeheader()
        w.writerows(satirlar)
    print(f"\nKaydedildi: {yol.relative_to(KOK)}  →  python eval/analiz.py {yol.relative_to(KOK)}")


if __name__ == "__main__":
    asyncio.run(main())
