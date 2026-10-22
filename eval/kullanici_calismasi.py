"""Kullanıcı çalışması analizi (8-9. hafta; AS3, AS5).

Üç veri kaynağı:
  1. Anonim seçim kayıtları: server/veri/olaylar.jsonl (POST /event)
  2. Paneldeki 👍/👎 geri bildirimleri: server/veri/geri_bildirim.jsonl (POST /geri-bildirim)
  3. SUS anketi: Google Forms'tan CSV olarak indirilen yanıtlar (docs/kullanici-calismasi/sus-anketi.md)

Kullanım:
    python eval/kullanici_calismasi.py --olaylar server/veri/olaylar.jsonl
        --geri-bildirim server/veri/geri_bildirim.jsonl --sus sus_yanitlari.csv

SUS CSV formatı: her satır bir katılımcı; "s1".."s10" sütunları (1-5 arası puan) ve
isteğe bağlı "teknik" sütunu (evet/hayır) — teknik/teknik olmayan karşılaştırması için (H5).

Çıktı: terminalde tablolar + data/user_study/ozet_anonim.csv (yalnızca TOPLU özet; repoya girebilir).
Ham veriler (olaylar.jsonl, SUS yanıtları) repoya GİRMEZ; ekip Drive'ında saklanır.
"""

import argparse
import sys
from pathlib import Path

import pandas as pd

KOK = Path(__file__).resolve().parents[1]


def sus_puani(satir: pd.Series) -> float:
    """Standart SUS hesabı (Brooke, 1996): tek numaralı sorular (olumlu) puan-1,
    çift numaralı sorular (olumsuz) 5-puan; toplam × 2.5 → 0-100 arası."""
    toplam = 0
    for i in range(1, 11):
        p = satir[f"s{i}"]
        toplam += (p - 1) if i % 2 == 1 else (5 - p)
    return toplam * 2.5


def secim_analizi(olaylar: pd.DataFrame) -> pd.DataFrame:
    print(f"\n=== AS3: Seçimler (n = {len(olaylar)} seçim, {olaylar.oturum_id.nunique()} katılımcı) ===")
    print("\nStrateji seçilme oranı (%):")
    print((olaylar.strateji.value_counts(normalize=True) * 100).round(0).to_string())
    print("\nGörev türü × strateji (seçim sayısı):")
    print(pd.crosstab(olaylar.gorev_turu, olaylar.strateji).to_string())
    print("\nGöndermeden önce düzenlenme oranı (strateji başına, %):")
    print((olaylar.groupby("strateji").duzenlendi.mean() * 100).round(0).to_string())
    print(f"\nMedyan seçim süresi: {olaylar.secim_suresi_ms.median() / 1000:.1f} sn")
    return olaylar.groupby("strateji").agg(
        secim=("strateji", "size"), duzenlenme_orani=("duzenlendi", "mean")
    ).reset_index()


def geri_bildirim_analizi(gb: pd.DataFrame) -> None:
    """👍/👎 oranı (genel, türe göre), tür düzeltme oranı ve okunacak notlar."""
    print(f"\n=== Geri bildirim (n = {len(gb)}) ===")
    gb = gb.assign(iyi=(gb.puan == "iyi").astype(int))
    print(f"👍 oranı: %{100 * gb.iyi.mean():.0f}")
    print("\nGörev türüne göre 👍 oranı (%) ve sayı:")
    print(gb.groupby("gorev_turu").iyi.agg(oran=lambda x: round(100 * x.mean()), n="count").to_string())
    if "tur_elle_degisti" in gb:
        print(f"\nKullanıcının algılanan türü düzelttiği oran: %{100 * gb.tur_elle_degisti.mean():.0f}"
              "  (yüksekse tür algılama iyileştirilmeli)")
    notlar = gb[gb.yorum.fillna("").str.strip() != ""]
    print(f"\nOkunacak notlar ({len(notlar)}) — 👎 olanlar önce:")
    for _, r in notlar.sort_values("iyi").iterrows():
        print(f"  {'👍' if r.iyi else '👎'} [{r.gorev_turu}] {r.yorum}")


def sus_analizi(sus: pd.DataFrame) -> None:
    sus = sus.assign(sus=sus.apply(sus_puani, axis=1))
    print(f"\n=== AS5: SUS (n = {len(sus)}) ===")
    print(f"Ortalama {sus.sus.mean():.1f} · medyan {sus.sus.median():.1f} · std {sus.sus.std():.1f}"
          f"  [literatür ortalaması 68]")
    if "teknik" in sus.columns:
        print(sus.groupby("teknik").sus.agg(["mean", "count"]).round(1).to_string())


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--olaylar", type=Path, default=KOK / "server/veri/olaylar.jsonl")
    ap.add_argument("--geri-bildirim", type=Path, default=KOK / "server/veri/geri_bildirim.jsonl")
    ap.add_argument("--sus", type=Path, help="SUS yanıtları CSV")
    args = ap.parse_args()

    if args.olaylar.exists():
        olaylar = pd.read_json(args.olaylar, lines=True)
        ozet = secim_analizi(olaylar)
        cikti = KOK / "data/user_study/ozet_anonim.csv"
        cikti.parent.mkdir(parents=True, exist_ok=True)
        ozet.to_csv(cikti, index=False)
        print(f"\nToplu özet: {cikti.relative_to(KOK)}")
    else:
        print(f"Seçim kaydı yok: {args.olaylar}")

    if args.geri_bildirim.exists():
        geri_bildirim_analizi(pd.read_json(args.geri_bildirim, lines=True))
    else:
        print(f"Geri bildirim yok: {args.geri_bildirim}")

    if args.sus:
        sus_analizi(pd.read_csv(args.sus))


if __name__ == "__main__":
    main()
