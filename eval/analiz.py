"""Hakem sonuçlarının istatistiksel analizi ve rapor grafikleri (9. hafta; AS1, AS2, AS4).

Kullanım:
    pip install -r eval/requirements.txt
    python eval/analiz.py eval/results/judge_<tarih>.csv

Ne hesaplar?
  AS1 — Genel kazanma oranı + işaret (binom) testi: geliştirilmiş prompt'lar orijinale karşı
        kaybetmeye göre anlamlı ölçüde daha sık kazanıyor mu? (beraberlikler teste girmez)
  AS2 — Strateji × görev türü kazanma oranı tablosu + ki-kare testi: strateji başarısı görev
        türüne göre değişiyor mu?
  AS4 — Strateji başına ortalama niyet korunması (1-5) ve uydurma oranı.

Çıktılar (rapora girer, elle çizilmez): docs/rapor/sekiller/*.png ve terminalde tablolar.
Yüzdeleri her zaman n ile birlikte verin (ör. "%64, n = 200").
"""

import argparse
import sys
from pathlib import Path

import pandas as pd
from scipy.stats import binomtest, chi2_contingency

KOK = Path(__file__).resolve().parents[1]
SEKILLER = KOK / "docs/rapor/sekiller"
STRATEJI_SIRASI = ["net", "detayli", "adim_adim", "format", "soru"]


def as1_genel(df: pd.DataFrame) -> None:
    kazandi = int((df.karar == "kazandi").sum())
    kaybetti = int((df.karar == "kaybetti").sum())
    berabere = int((df.karar == "berabere").sum())
    n = len(df)
    print("\n=== AS1: Geliştirilmiş prompt orijinale karşı ===")
    print(f"kazandı {kazandi} (%{100 * kazandi / n:.0f}) · berabere {berabere} · kaybetti {kaybetti}  (n = {n})")
    if kazandi + kaybetti:
        p = binomtest(kazandi, kazandi + kaybetti, 0.5, alternative="greater").pvalue
        sonuc = "ANLAMLI (H1 desteklendi)" if p < 0.05 else "anlamlı değil"
        print(f"İşaret testi (beraberlikler hariç, n = {kazandi + kaybetti}): p = {p:.4f} → {sonuc}")


def as2_tablo(df: pd.DataFrame) -> pd.DataFrame:
    df = df.assign(kazandi=(df.karar == "kazandi").astype(int))
    tablo = df.pivot_table(index="strateji", columns="gorev_turu", values="kazandi", aggfunc="mean")
    tablo = tablo.reindex([s for s in STRATEJI_SIRASI if s in tablo.index])
    print("\n=== AS2: Kazanma oranı (strateji × görev türü) ===")
    print((tablo * 100).round(0).to_string())
    sayim = pd.crosstab(df.strateji, df.karar)
    if sayim.shape[0] > 1 and sayim.shape[1] > 1:
        chi2, p, sd, _ = chi2_contingency(sayim)
        print(f"Ki-kare (strateji × karar): χ² = {chi2:.2f}, sd = {sd}, p = {p:.4f}")
    return tablo


def as4_niyet(df: pd.DataFrame) -> None:
    print("\n=== AS4: Niyet korunması ve uydurma ===")
    d = df.copy()
    d["niyet"] = pd.to_numeric(d.niyet, errors="coerce")
    d["uydurma"] = d.uydurma.astype(str).str.lower().eq("true")
    ozet = d.groupby("strateji").agg(niyet_ort=("niyet", "mean"), uydurma_orani=("uydurma", "mean"), n=("id", "count"))
    ozet = ozet.reindex([s for s in STRATEJI_SIRASI if s in ozet.index])
    print(ozet.round(2).to_string())
    print(f"Genel niyet ortalaması: {d.niyet.mean():.2f} / 5 [hedef ≥ 4]")


def grafik(tablo: pd.DataFrame, df: pd.DataFrame) -> None:
    import matplotlib

    matplotlib.use("Agg")  # ekran olmadan PNG üret
    import matplotlib.pyplot as plt

    SEKILLER.mkdir(parents=True, exist_ok=True)

    # 1) Strateji başına kazanma / berabere / kaybetme yığılmış çubuk
    oran = pd.crosstab(df.strateji, df.karar, normalize="index").reindex(
        [s for s in STRATEJI_SIRASI if s in df.strateji.unique()]
    )
    oran = oran.reindex(columns=[k for k in ["kazandi", "berabere", "kaybetti"] if k in oran.columns])
    renkler = {"kazandi": "#2a9d8f", "berabere": "#bdbdbd", "kaybetti": "#e76f51"}
    ax = (oran * 100).plot.barh(stacked=True, color=[renkler[k] for k in oran.columns], figsize=(7, 3.5))
    ax.set_xlabel("Karşılaştırmaların yüzdesi")
    ax.set_ylabel("")
    ax.set_title(f"Geliştirilmiş prompt orijinale karşı (n = {len(df)})")
    ax.legend(["kazandı", "berabere", "kaybetti"][: len(oran.columns)], loc="lower right", frameon=False)
    plt.tight_layout()
    plt.savefig(SEKILLER / "kazanma_strateji.png", dpi=200)
    plt.close()

    # 2) Strateji × görev türü ısı haritası
    fig, ax = plt.subplots(figsize=(7, 3.5))
    im = ax.imshow(tablo.values * 100, cmap="Greens", vmin=0, vmax=100)
    ax.set_xticks(range(len(tablo.columns)), tablo.columns)
    ax.set_yticks(range(len(tablo.index)), tablo.index)
    for i in range(tablo.shape[0]):
        for j in range(tablo.shape[1]):
            v = tablo.values[i, j]
            if pd.notna(v):
                ax.text(j, i, f"{v * 100:.0f}", ha="center", va="center", fontsize=9)
    fig.colorbar(im, label="kazanma oranı (%)")
    ax.set_title("Strateji × görev türü kazanma oranı")
    plt.tight_layout()
    plt.savefig(SEKILLER / "strateji_gorev_isi.png", dpi=200)
    plt.close()
    print(f"\nGrafikler: {SEKILLER.relative_to(KOK)}/")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", type=Path)
    args = ap.parse_args()
    df = pd.read_csv(args.csv)
    as1_genel(df)
    tablo = as2_tablo(df)
    as4_niyet(df)
    grafik(tablo, df)


if __name__ == "__main__":
    main()
