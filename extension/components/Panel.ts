/**
 * PANEL BİLEŞENİ: "✨ Geliştir" küresi + yıldızlı 5 kartlı panel
 *
 * Siteden bağımsızdır; hangi sitede olduğumuzu bilmez, yazı kutusuyla yalnızca
 * adaptör üzerinden konuşur. Böylece aynı panel ChatGPT, Claude, Gemini ve demo
 * sayfasında çalışır. Framework yok, düz DOM ile yazıldı. Görünüm: content/style.css
 *
 * Prompt'u ASLA kullanıcı adına göndermez; yalnızca yazı kutusuna yazar.
 */
import type { SiteAdapter } from '../adapters/types';
import { bosluklariBul, parcalaraAyir } from '../lib/bosluklar';
import type { GelistirCevabi, GelistirIstegi, OlayMesaji, Secenek } from '../lib/schema';

/** Panelin dış dünyayla konuşma yolları (içerik betiğinde ve demoda farklı verilebilir). */
export type PanelBaglantisi = {
  gelistir(istek: GelistirIstegi): Promise<GelistirCevabi>;
  olayGonder(olay: OlayMesaji['olay']): void;
};

/** Her stratejinin simgesi ve kısa ipucu. Renkler style.css'te [data-strateji] ile verilir. */
const STRATEJI_GORUNUMU: Record<Secenek['strateji'], { simge: string; ipucu: string }> = {
  net: { simge: '⚡', ipucu: 'Kısa ve tek net görev' },
  detayli: { simge: '🔭', ipucu: 'Rol, amaç, hedef kitle' },
  adim_adim: { simge: '🪜', ipucu: 'Önce plan, sonra çözüm' },
  format: { simge: '🧩', ipucu: 'Çıktının biçimi belli' },
  soru: { simge: '💬', ipucu: 'Önce eksikleri sorsun' },
};

// Beklerken dönen küçük mesajlar (sıkılmasın diye)
const BEKLEME_MESAJLARI = [
  'Yıldızlar hizalanıyor…',
  'Beş farklı yol çiziliyor…',
  'Takımyıldızlar okunuyor…',
  'Prompt parlatılıyor…',
];

export class Panel {
  private kutu: HTMLDivElement; // panelin kendisi
  private liste: HTMLDivElement; // kartların bulunduğu alan
  private durum: HTMLParagraphElement; // bekleme mesajı, hata, süre bilgisi
  private geriAlBtn: HTMLButtonElement;
  private kure: HTMLButtonElement; // "✨ Geliştir" butonu
  private orijinal: string | null = null; // "Geri al" için kullanıcının ilk yazdığı metin
  private calisiyor = false; // aynı anda iki istek gitmesin
  private panelAcilis = 0; // seçim süresini ölçmek için
  private takipBitir: (() => void) | null = null;
  private mesajZamanlayici = 0;

  constructor(
    kok: HTMLElement,
    private adapter: SiteAdapter,
    private baglanti: PanelBaglantisi,
  ) {
    // --- Geliştir küresi ---
    this.kure = el('button', 'sp-kure');
    this.kure.title = 'Prompt\'unu geliştir (Ctrl+Shift+E)';
    this.kure.append(el('span', 'sp-kure-yildiz', '✦'), el('span', 'sp-kure-yazi', 'Geliştir'));
    this.kure.addEventListener('click', () => this.gelistir());

    // --- Panel ---
    this.kutu = el('div', 'sp-panel');
    this.kutu.hidden = true;
    this.kutu.setAttribute('role', 'dialog');
    this.kutu.setAttribute('aria-label', 'Smarter Prompt seçenekleri');

    // Yıldız katmanları: tamamen CSS ile çizilir (bkz. style.css .sp-yildizlar)
    const gokyuzu = el('div', 'sp-gokyuzu');
    gokyuzu.setAttribute('aria-hidden', 'true');
    gokyuzu.append(el('div', 'sp-yildizlar sp-y1'), el('div', 'sp-yildizlar sp-y2'), el('div', 'sp-kayan'));

    // Üst çubuk: logo + Geri al + Kapat
    const ust = el('div', 'sp-ust');
    const logo = el('div', 'sp-logo');
    logo.append(el('span', 'sp-logo-simge', '✨'), el('span', 'sp-logo-yazi', 'Smarter Prompt'));
    this.geriAlBtn = el('button', 'sp-ikincil', '↶ Geri al');
    this.geriAlBtn.hidden = true;
    this.geriAlBtn.addEventListener('click', () => this.geriAl());
    const kapat = el('button', 'sp-ikincil sp-kapat', '✕');
    kapat.setAttribute('aria-label', 'Kapat');
    kapat.addEventListener('click', () => this.kapat());
    ust.append(logo, this.geriAlBtn, kapat);

    this.durum = el('p', 'sp-durum');
    this.durum.setAttribute('aria-live', 'polite'); // ekran okuyucular durum değişimini okusun
    this.liste = el('div', 'sp-liste');
    const icerik = el('div', 'sp-icerik');
    icerik.append(ust, this.durum, this.liste);
    this.kutu.append(gokyuzu, icerik);
    kok.append(this.kutu, this.kure);

    // Esc ile paneli kapat
    kok.ownerDocument.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.kutu.hidden) this.kapat();
    });
  }

  /** Yazı kutusundaki metni geliştirip seçenekleri gösterir. */
  async gelistir() {
    if (this.calisiyor) return;
    const kutu = this.adapter.kutuyuBul();
    const metin = kutu ? this.adapter.metniOku(kutu) : '';
    this.kutu.hidden = false;
    this.liste.replaceChildren();
    this.durum.className = 'sp-durum';
    if (!metin) {
      this.durum.textContent = '🌙 Önce yazı kutusuna kısa bir prompt yaz, sonra tekrar dene.';
      return;
    }

    this.calisiyor = true;
    this.beklemeyiGoster();
    let cevap: GelistirCevabi;
    try {
      cevap = await this.baglanti.gelistir({ tur: 'gelistir', prompt: metin, site: this.adapter.site });
    } catch {
      // Eklenti güncellendiyse eski sayfadaki betik arka planla konuşamaz
      cevap = { ok: false, hata: 'Eklenti yeniden yüklendi; sayfayı yenileyin.' };
    } finally {
      this.calisiyor = false;
      this.beklemeyiBitir();
    }

    if (!cevap.ok) {
      this.durum.className = 'sp-durum sp-hata';
      this.durum.textContent = `☄️ ${cevap.hata}`;
      this.liste.replaceChildren();
      return;
    }
    const { eksik_bilgiler, secenekler, sure_ms, model } = cevap.veri;
    // Ör: "5 yol bulundu · 2.1 sn · Eksik: programlama dili"
    this.durum.textContent =
      `🌟 5 yol bulundu · ${(sure_ms / 1000).toFixed(1)} sn` +
      (model.startsWith('yerel') ? ' · yerel model' : '') +
      (eksik_bilgiler.length ? ` · Eksik: ${eksik_bilgiler.join(', ')}` : '');
    this.panelAcilis = performance.now();
    this.liste.replaceChildren(...secenekler.map((s, i) => this.kart(s, i, metin, cevap.veri)));
  }

  /** Beklerken: dönen mesaj + parıldayan yer tutucu kartlar. */
  private beklemeyiGoster() {
    let i = 0;
    this.durum.textContent = BEKLEME_MESAJLARI[0]!;
    this.mesajZamanlayici = window.setInterval(() => {
      i = (i + 1) % BEKLEME_MESAJLARI.length;
      this.durum.textContent = BEKLEME_MESAJLARI[i]!;
    }, 1800);
    this.kure.classList.add('sp-calisiyor');
    this.liste.replaceChildren(
      ...Array.from({ length: 5 }, (_, n) => {
        const yer = el('div', 'sp-kart sp-yer-tutucu');
        yer.style.setProperty('--sira', String(n));
        yer.append(el('div', 'sp-cizgi sp-kisa'), el('div', 'sp-cizgi'), el('div', 'sp-cizgi sp-orta'));
        return yer;
      }),
    );
  }

  private beklemeyiBitir() {
    window.clearInterval(this.mesajZamanlayici);
    this.kure.classList.remove('sp-calisiyor');
  }

  /** Tek bir seçenek kartı: simge, başlık, "Kullan", prompt (boşluklar vurgulu) ve "neden daha iyi". */
  private kart(
    s: Secenek,
    sira: number,
    orijinal: string,
    veri: { gorev_turu: string; meta_prompt_surumu: string },
  ) {
    const gorunum = STRATEJI_GORUNUMU[s.strateji];
    const kart = el('article', 'sp-kart');
    kart.dataset.strateji = s.strateji; // renk style.css'ten
    kart.style.setProperty('--sira', String(sira)); // kartlar sırayla süzülsün

    const sec = el('button', 'sp-sec', 'Kullan ➜');
    sec.setAttribute('aria-label', `${s.baslik} seçeneğini kullan`);
    sec.addEventListener('click', () => {
      const kutu = this.adapter.kutuyuBul();
      if (!kutu) return;
      this.orijinal = orijinal; // geri alabilmek için sakla
      this.adapter.metniYaz(kutu, s.prompt);
      this.geriAlBtn.hidden = false;
      this.kapat();
      this.secimiTakipEt(kutu, s, veri, Math.round(performance.now() - this.panelAcilis));
    });

    // Başlık satırı: simge rozeti + başlık/ipucu + Kullan
    const ust = el('div', 'sp-kart-ust');
    const baslik = el('div', 'sp-kart-baslik');
    baslik.append(el('h3', '', s.baslik), el('span', 'sp-ipucu', gorunum.ipucu));
    ust.append(el('span', 'sp-rozet', gorunum.simge), baslik, sec);

    // Prompt metni: [boşluklar] altın renkte vurgulanır (karar 0004, katman 1)
    const prompt = el('p', 'sp-prompt');
    for (const parca of parcalaraAyir(s.prompt)) {
      prompt.append(parca.tur === 'bosluk' ? el('mark', 'sp-bosluk', parca.deger) : parca.deger);
    }

    kart.append(ust, prompt);
    const bosluk = bosluklariBul(s.prompt).length;
    if (bosluk) {
      const etiket = el('span', 'sp-doldur', `✏️ ${bosluk} boşluk doldurulacak`);
      etiket.title = 'Köşeli parantezli yerleri kendi bilgilerinle değiştirirsen cevap daha iyi olur.';
      kart.append(etiket);
    }
    kart.append(el('p', 'sp-neden', s.neden));
    return kart;
  }

  private kapat() {
    this.kutu.hidden = true;
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
