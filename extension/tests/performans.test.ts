import { describe, expect, it } from 'vitest';
import { ozetle, type PerformansKaydi } from '../lib/performans';

const kayit = (ms: number, ok = true, onbellekten = false): PerformansKaydi => ({
  zaman: '2026-10-22T10:00:00Z',
  ok,
  uctan_uca_ms: ms,
  sunucu_ms: ok ? ms - 100 : null,
  model: 'gemini/gemini-3.5-flash-lite',
  site: 'gemini',
  onbellekten,
  hata: ok ? null : 'kota',
});

describe('ozetle', () => {
  it('medyan, başarı oranı, en yavaş ve hedef altı oranını hesaplar', () => {
    const o = ozetle([kayit(3000), kayit(5000), kayit(9000), kayit(800, false)]);
    expect(o.istek).toBe(4);
    expect(o.basari_orani).toBe(0.75);
    expect(o.medyan_ms).toBe(5000);
    expect(o.en_yavas_ms).toBe(9000);
    expect(o.hedef_alti_orani).toBeCloseTo(1 / 3);
  });

  it('önbellekten gelenleri ölçüme katmaz', () => {
    const o = ozetle([kayit(6000), kayit(5, true, true)]);
    expect(o.istek).toBe(1);
    expect(o.medyan_ms).toBe(6000);
  });

  it('çift sayıda kayıtta ortadaki ikisinin ortalamasını alır, kayıt yoksa null', () => {
    expect(ozetle([kayit(4000), kayit(6000)]).medyan_ms).toBe(5000);
    expect(ozetle([]).medyan_ms).toBeNull();
  });
});
