/**
 * KÖŞELİ PARANTEZLİ BOŞLUKLAR — [hedef kitle], [programlama dili] ...
 *
 * Meta-prompt bilinmeyen bilgileri uydurmak yerine boşluk bırakır. Bu yardımcılar
 * boşlukları bulur ve metni parçalara ayırır ki panel onları vurgulayabilsin
 * (karar 0004, katman 1). Doldurma formu (katman 2) da bunları kullanacak.
 */

// 1-40 karakterlik, iç içe parantez içermeyen [ ... ] ifadeleri
const BOSLUK = /\[([^[\]\n]{1,40})\]/g;

/** Metindeki farklı boşlukların adlarını, ilk görülme sırasıyla döndürür. */
export function bosluklariBul(metin: string): string[] {
  const adlar = [...metin.matchAll(BOSLUK)].map((m) => m[1]!.trim());
  return [...new Set(adlar)];
}

export type MetinParcasi = { tur: 'metin' | 'bosluk'; deger: string };

/** Metni düz metin ve boşluk parçalarına ayırır (vurgulu gösterim için). */
export function parcalaraAyir(metin: string): MetinParcasi[] {
  const parcalar: MetinParcasi[] = [];
  let son = 0;
  for (const m of metin.matchAll(BOSLUK)) {
    if (m.index! > son) parcalar.push({ tur: 'metin', deger: metin.slice(son, m.index) });
    parcalar.push({ tur: 'bosluk', deger: m[0] });
    son = m.index! + m[0].length;
  }
  if (son < metin.length) parcalar.push({ tur: 'metin', deger: metin.slice(son) });
  return parcalar;
}

/** Boşlukları verilen değerlerle doldurur; boş bırakılanlar olduğu gibi kalır. */
export function bosluklariDoldur(metin: string, degerler: Record<string, string>): string {
  return metin.replace(BOSLUK, (tam, ad: string) => degerler[ad.trim()]?.trim() || tam);
}
