import { describe, expect, it } from 'vitest';
import { bosluklariBul, bosluklariDoldur, parcalaraAyir } from '../lib/bosluklar';

const ornek = 'Sen uzman bir yazılımcısın. [hedef kitle] için [programlama dili] ile kod yaz. [hedef kitle] yeni başlıyor.';

describe('bosluklariBul', () => {
  it('farklı boşlukları sırayla ve tekrarsız bulur', () => {
    expect(bosluklariBul(ornek)).toEqual(['hedef kitle', 'programlama dili']);
  });

  it('boşluk yoksa boş liste döner', () => {
    expect(bosluklariBul('Python ile liste sırala.')).toEqual([]);
  });

  it('çok uzun köşeli parantezleri boşluk saymaz', () => {
    expect(bosluklariBul(`[${'x'.repeat(60)}]`)).toEqual([]);
  });
});

describe('parcalaraAyir', () => {
  it('metni ve boşlukları sırayla ayırır, birleşince aynı metin çıkar', () => {
    const p = parcalaraAyir(ornek);
    expect(p.filter((x) => x.tur === 'bosluk').map((x) => x.deger)).toEqual([
      '[hedef kitle]',
      '[programlama dili]',
      '[hedef kitle]',
    ]);
    expect(p.map((x) => x.deger).join('')).toBe(ornek);
  });
});

describe('bosluklariDoldur', () => {
  it('aynı boşluğun her geçişini doldurur, boş bırakılanı korur', () => {
    const sonuc = bosluklariDoldur(ornek, { 'hedef kitle': 'lise öğrencileri', 'programlama dili': '  ' });
    expect(sonuc).toBe(
      'Sen uzman bir yazılımcısın. lise öğrencileri için [programlama dili] ile kod yaz. lise öğrencileri yeni başlıyor.',
    );
  });
});
