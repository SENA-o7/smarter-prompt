/**
 * PANEL BİLEŞENİ: "✨ Geliştir" butonu + 5 kartlı panel
 *
 * Siteden bağımsızdır; hangi sitede olduğumuzu bilmez, yazı kutusuyla yalnızca
 * adaptör üzerinden konuşur. Böylece aynı panel ChatGPT, Claude, Gemini ve demo
 * sayfasında çalışır. MVP'de framework yok, düz DOM ile yazıldı.
 *
 * Prompt'u ASLA kullanıcı adına göndermez; yalnızca yazı kutusuna yazar.
 */
import type { SiteAdapter } from '../adapters/types';
import type { GelistirCevabi, GelistirIstegi, OlayMesaji, Secenek } from '../lib/schema';

/** Panelin dış dünyayla konuşma yolları (içerik betiğinde ve demoda farklı verilebilir). */
export type PanelBaglantisi = {
  gelistir(istek: GelistirIstegi): Promise<GelistirCevabi>;
  olayGonder(olay: OlayMesaji['olay']): void;
};

export class Panel {
  private kutu: HTMLDivElement; // panelin kendisi
  private liste: HTMLDivElement; // kartların bulunduğu alan
  private durum: HTMLParagraphElement; // "Geliştiriliyor…", hata mesajı, süre bilgisi
  private geriAlBtn: HTMLButtonElement;
  private orijinal: string | null = null; // "Geri al" için kullanıcının ilk yazdığı metin
  private calisiyor = false; // aynı anda iki istek gitmesin
  private panelAcilis = 0; // seçim süresini ölçmek için
  private takipBitir: (() => void) | null = null;

  constructor(
    kok: HTMLElement,
    private adapter: SiteAdapter,
    private baglanti: PanelBaglantisi,
  ) {
    const buton = el('button', 'sp-ana-buton', '✨ Geliştir');
    buton.title = 'Ctrl+Shift+E';
    buton.addEventListener('click', () => this.gelistir());

    this.kutu = el('div', 'sp-panel');
    this.kutu.hidden = true;
    this.kutu.setAttribute('role', 'dialog');
    this.kutu.setAttribute('aria-label', 'Smarter Prompt seçenekleri');

    // Üst çubuk: başlık + Geri al + Kapat
    const ust = el('div', 'sp-ust');
    ust.append(el('strong', '', 'Smarter Prompt'));
    this.geriAlBtn = el('button', 'sp-ikincil', 'Geri al');
    this.geriAlBtn.hidden = true;
    this.geriAlBtn.addEventListener('click', () => this.geriAl());
    const kapat = el('button', 'sp-ikincil', '✕');
    kapat.setAttribute('aria-label', 'Kapat');
    kapat.addEventListener('click', () => (this.kutu.hidden = true));
    ust.append(this.geriAlBtn, kapat);

    this.durum = el('p', 'sp-durum');
    this.durum.setAttribute('aria-live', 'polite'); // ekran okuyucular durum değişimini okusun
    this.liste = el('div', 'sp-liste');
    this.kutu.append(ust, this.durum, this.liste);
    kok.append(this.kutu, buton);

    // Esc ile paneli kapat
    kok.ownerDocument.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.kutu.hidden) this.kutu.hidden = true;
    });
  }

  /** Yazı kutusundaki metni geliştirip seçenekleri gösterir. */
  async gelistir() {
    if (this.calisiyor) return;
    const kutu = this.adapter.kutuyuBul();
    const metin = kutu ? this.adapter.metniOku(kutu) : '';
    this.kutu.hidden = false;
    this.liste.replaceChildren();
    if (!metin) {
      this.durum.textContent = 'Önce yazı kutusuna bir prompt yaz.';
      return;
    }

    this.calisiyor = true;
    this.durum.textContent = 'Geliştiriliyor…';
    let cevap: GelistirCevabi;
    try {
      cevap = await this.baglanti.gelistir({ tur: 'gelistir', prompt: metin, site: this.adapter.site });
    } catch {
      // Eklenti güncellendiyse eski sayfadaki betik arka planla konuşamaz
      cevap = { ok: false, hata: 'Eklenti yeniden yüklendi; sayfayı yenileyin.' };
    } finally {
      this.calisiyor = false;
    }

    if (!cevap.ok) {
      this.durum.textContent = cevap.hata;
      return;
    }
    const { eksik_bilgiler, secenekler, sure_ms, model } = cevap.veri;
    // Ör: "2.1 sn · Eksik: programlama dili, programın amacı"
    this.durum.textContent =
      `${(sure_ms / 1000).toFixed(1)} sn` +
      (model.startsWith('yerel') ? ' · yerel model' : '') +
      (eksik_bilgiler.length ? ` · Eksik: ${eksik_bilgiler.join(', ')}` : '');
    this.panelAcilis = performance.now();
    this.liste.replaceChildren(...secenekler.map((s) => this.kart(s, metin, cevap.veri)));
  }

  /** Tek bir seçenek kartı: başlık, "Kullan" butonu, prompt metni ve "neden daha iyi". */
  private kart(s: Secenek, orijinal: string, veri: { gorev_turu: string; meta_prompt_surumu: string }) {
    const kart = el('article', 'sp-kart');
    const sec = el('button', 'sp-sec', 'Kullan');
    sec.setAttribute('aria-label', `${s.baslik} seçeneğini kullan`);
    sec.addEventListener('click', () => {
      const kutu = this.adapter.kutuyuBul();
      if (!kutu) return;
      this.orijinal = orijinal; // geri alabilmek için sakla
      this.adapter.metniYaz(kutu, s.prompt);
      this.geriAlBtn.hidden = false;
      this.kutu.hidden = true;
      this.secimiTakipEt(kutu, s, veri, Math.round(performance.now() - this.panelAcilis));
    });
    const baslik = el('div', 'sp-kart-ust');
    baslik.append(el('h3', '', s.baslik), sec);
    kart.append(baslik, el('p', 'sp-prompt', s.prompt), el('p', 'sp-neden', s.neden));
    return kart;
  }

  /**
   * Kullanıcı seçtiği prompt'u gönderene kadar yazı kutusunu izler ve
   * "göndermeden önce düzenledi mi?" bilgisini çıkarır (AS3 için).
   *
   * Siteden bağımsız yöntem: Mesaj gönderilince sitelerin hepsi yazı kutusunu boşaltır.
   * Kutu boşaldığı an, boşalmadan önceki son metin seçilen metinle aynı mı diye bakarız.
   * Metnin kendisi hiçbir yere gönderilmez; yalnızca evet/hayır sonucu.
   */
  private secimiTakipEt(
    kutu: HTMLElement,
    s: Secenek,
    veri: { gorev_turu: string; meta_prompt_surumu: string },
    secimSuresi: number,
  ) {
    this.takipBitir?.(); // önceki takip varsa bırak
    let sonMetin = s.prompt;
    const kontrol = () => {
      const simdiki = this.adapter.metniOku(kutu);
      if (simdiki) {
        sonMetin = simdiki;
        return;
      }
      // Kutu boşaldı → gönderildi (ya da kullanıcı sildi; ikisini ayırt edemiyoruz, raporda kısıt)
      bitir();
      this.baglanti.olayGonder({
        site: this.adapter.site,
        strateji: s.strateji,
        gorev_turu: veri.gorev_turu as OlayMesaji['olay']['gorev_turu'],
        duzenlendi: sonMetin.trim() !== s.prompt.trim(),
        secim_suresi_ms: secimSuresi,
        meta_prompt_surumu: veri.meta_prompt_surumu,
      });
    };
    // Bazı siteler göndermeden sonra kutuyu yeniden oluşturur; bu yüzden olay yerine
    // kısa aralıklarla da kontrol ediyoruz. 10 dakika sonra takip kendiliğinden biter.
    const zamanlayici = window.setInterval(kontrol, 500);
    const sure = window.setTimeout(() => bitir(), 10 * 60 * 1000);
    const bitir = () => {
      window.clearInterval(zamanlayici);
      window.clearTimeout(sure);
      this.takipBitir = null;
    };
    this.takipBitir = bitir;
  }

  /** Kullanıcının ilk yazdığı metni yazı kutusuna geri koyar. */
  private geriAl() {
    const kutu = this.adapter.kutuyuBul();
    if (!kutu || this.orijinal === null) return;
    this.takipBitir?.(); // geri alındıysa seçim kullanılmamış sayılır
    this.adapter.metniYaz(kutu, this.orijinal);
    this.orijinal = null;
    this.geriAlBtn.hidden = true;
  }
}

/** Küçük yardımcı: etiket + CSS sınıfı + metinle element oluşturur. */
function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = '', metin = '') {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin; // textContent: HTML enjeksiyonuna karşı güvenli
  return e;
}
