import { describe, expect, it } from 'vitest';
import { sunucuAdresiniDuzelt } from '../lib/config';
import { EnhanceResponseSchema, STRATEJILER } from '../lib/schema';

const gecerli = {
  gorev_turu: 'kod',
  eksik_bilgiler: ['programlama dili'],
  secenekler: STRATEJILER.map((s) => ({ strateji: s, baslik: s, prompt: 'p', neden: 'n' })),
  model: 'test',
  meta_prompt_surumu: 'v0',
  sure_ms: 1200,
};

describe('EnhanceResponseSchema', () => {
  it('geçerli cevabı kabul eder', () => {
    expect(EnhanceResponseSchema.safeParse(gecerli).success).toBe(true);
  });

  it('5 olmayan seçenek sayısını reddeder', () => {
    const bozuk = { ...gecerli, secenekler: gecerli.secenekler.slice(0, 4) };
    expect(EnhanceResponseSchema.safeParse(bozuk).success).toBe(false);
  });

  it('v2 türlerini (ses, matematik) kabul eder', () => {
    expect(EnhanceResponseSchema.safeParse({ ...gecerli, gorev_turu: 'ses' }).success).toBe(true);
    expect(EnhanceResponseSchema.safeParse({ ...gecerli, gorev_turu: 'matematik' }).success).toBe(true);
    expect(EnhanceResponseSchema.safeParse({ ...gecerli, gorev_turu: 'video' }).success).toBe(false);
  });

  it('bilinmeyen stratejiyi reddeder', () => {
    const bozuk = {
      ...gecerli,
      secenekler: [...gecerli.secenekler.slice(0, 4), { strateji: 'x', baslik: 'b', prompt: 'p', neden: 'n' }],
    };
    expect(EnhanceResponseSchema.safeParse(bozuk).success).toBe(false);
  });
});

describe('sunucuAdresiniDuzelt', () => {
  it('sondaki eğik çizgiyi ve yolu atar', () => {
    expect(sunucuAdresiniDuzelt(' https://ornek.onrender.com/ ')).toBe('https://ornek.onrender.com');
    expect(sunucuAdresiniDuzelt('http://localhost:8000/docs')).toBe('http://localhost:8000');
  });

  it('şifresiz http yalnızca kendi bilgisayarı için kabul edilir', () => {
    expect(sunucuAdresiniDuzelt('http://ornek.com')).toBeNull();
    expect(sunucuAdresiniDuzelt('ftp://ornek.com')).toBeNull();
    expect(sunucuAdresiniDuzelt('olmayan adres')).toBeNull();
  });
});
