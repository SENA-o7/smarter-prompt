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
import { bosluklariBul, bosluklariDoldur, parcalaraAyir } from '../lib/bosluklar';
import {
  GOREV_TURLERI,
  type EnhanceResponse,
  type GelistirCevabi,
  type GelistirIstegi,
  type GeriBildirimMesaji,
  type GorevTuru,
  type OlayMesaji,
  type Secenek,
} from '../lib/schema';

/** Panelin dış dünyayla konuşma yolları (içerik betiğinde ve demoda farklı verilebilir). */
export type PanelBaglantisi = {
  gelistir(istek: GelistirIstegi): Promise<GelistirCevabi>;
  olayGonder(olay: OlayMesaji['olay']): void;
  /** 👍/👎 geri bildirimi; gönderildiyse true */
  geriBildirim(gb: GeriBildirimMesaji['gb']): Promise<boolean>;
};

/** Her stratejinin simgesi ve kısa ipucu. Renkler style.css'te [data-strateji] ile verilir. */
const STRATEJI_GORUNUMU: Record<Secenek['strateji'], { simge: string; ipucu: string }> = {
  net: { simge: '⚡', ipucu: 'Kısa ve tek net görev' },
  detayli: { simge: '🔭', ipucu: 'Rol, amaç, hedef kitle' },
  adim_adim: { simge: '🪜', ipucu: 'Önce plan, sonra çözüm' },
  format: { simge: '🧩', ipucu: 'Çıktının biçimi belli' },
  soru: { simge: '💬', ipucu: 'Önce eksikleri sorsun' },
};

/** Tür etiketinde görünen adlar (meta-prompt v2 türleri) */
const TUR_GORUNUMU: Record<GorevTuru, string> = {
  kod: '💻 Kod',
  yazi: '✍️ Metin',
  analiz: '📊 Analiz',
  gorsel: '🎨 Görsel',
  ses: '🎵 Ses / müzik',
  matematik: '🧮 Matematik',
  diger: '🌀 Diğer',
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
  private turAlani: HTMLDivElement; // "Algılanan tür: 🎨 Görsel ▾"
  private geriAlani: HTMLDivElement; // 👍/👎 geri bildirim
  private turElleDegisti = false; // kullanıcı algılanan türü düzeltti mi (geri bildirimde ölçülür)

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
    this.turAlani = el('div', 'sp-tur');
    this.geriAlani = el('div', 'sp-geri');
    const icerik = el('div', 'sp-icerik');
    icerik.append(ust, this.durum, this.turAlani, this.liste, this.geriAlani);
    this.kutu.append(gokyuzu, icerik);
    kok.append(this.kutu, this.kure);

    // Esc ile paneli kapat
    kok.ownerDocument.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.kutu.hidden) this.kapat();
    });
  }

  /** Yazı kutusundaki metni geliştirip seçenekleri gösterir. */
  async gelistir(zorunluTur?: GorevTuru) {
    if (this.calisiyor) return;
    const kutu = this.adapter.kutuyuBul();
    const metin = kutu ? this.adapter.metniOku(kutu) : '';
    this.kutu.hidden = false;
    this.liste.replaceChildren();
    this.durum.className = 'sp-durum';
    this.turAlani.replaceChildren();
    this.geriAlani.replaceChildren();
    if (!zorunluTur) this.turElleDegisti = false;
    if (!metin) {
      this.durum.textContent = '🌙 Önce yazı kutusuna kısa bir prompt yaz, sonra tekrar dene.';
      return;
    }

    this.calisiyor = true;
    this.beklemeyiGoster();
    let cevap: GelistirCevabi;
    try {
      cevap = await this.baglanti.gelistir({
        tur: 'gelistir',
        prompt: metin,
        site: this.adapter.site,
        gorev_turu: zorunluTur,
      });
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
    this.turEtiketiniCiz(cevap.veri.gorev_turu);
    this.geriBildirimiCiz(cevap.veri);
  }

  /**
   * "Algılanan tür: 🎨 Görsel ▾" — model türü otomatik bulur; yanlışsa kullanıcı tek tıkla
   * değiştirir ve 5 seçenek o türe göre yeniden üretilir (meta-prompt v2, karar 0005).
   * Her seferinde "ne için kullanacaksın?" diye sormuyoruz: kısa prompt yazan kullanıcıyı yavaşlatır.
   */
  private turEtiketiniCiz(tur: GorevTuru) {
    const etiket = el('label', 'sp-tur-etiket', 'Algılanan tür:');
    const secim = el('select', 'sp-tur-sec');
    secim.setAttribute('aria-label', 'Görev türü; değiştirirsen seçenekler yeniden üretilir');
    for (const t of GOREV_TURLERI) {
      const secenek = el('option', '', TUR_GORUNUMU[t]);
      secenek.value = t;
      secenek.selected = t === tur;
      secim.append(secenek);
    }
    secim.addEventListener('change', () => {
      this.turElleDegisti = true;
      this.gelistir(secim.value as GorevTuru);
    });
    etiket.append(secim);
    const ipucu = el('span', 'sp-tur-ipucu', this.turElleDegisti ? '✓ senin seçimin' : 'yanlışsa değiştir');
    this.turAlani.replaceChildren(etiket, ipucu);
  }

  /** Panelin altı: "Bu öneriler işine yaradı mı? 👍 👎" → isteğe bağlı not → gönder. */
  private geriBildirimiCiz(veri: EnhanceResponse) {
    const soru = el('span', 'sp-geri-soru', 'Bu öneriler işine yaradı mı?');
    const iyi = el('button', 'sp-geri-btn', '👍');
    const kotu = el('button', 'sp-geri-btn', '👎');
    iyi.setAttribute('aria-label', 'Evet, işime yaradı');
    kotu.setAttribute('aria-label', 'Hayır, işime yaramadı');
    const satir = el('div', 'sp-geri-satir');
    satir.append(soru, iyi, kotu);

    const notAlani = (puan: 'iyi' | 'kotu') => {
      const yazi = el('textarea', 'sp-geri-not');
      yazi.maxLength = 500;
      yazi.rows = 2;
      yazi.placeholder =
        puan === 'iyi' ? 'En çok neyi beğendin? (isteğe bağlı)' : 'Ne eksikti, ne olmalıydı? (isteğe bağlı)';
      // Sitenin klavye kısayolları yazarken tuşları çalmasın
      for (const olay of ['keydown', 'keyup', 'keypress'] as const) {
        yazi.addEventListener(olay, (e) => e.stopPropagation());
      }
      const uyari = el('small', 'sp-geri-uyari', 'Kişisel bilgi (isim, e-posta, şifre) yazma.');
      const gonder = el('button', 'sp-geri-gonder', 'Gönder ✦');
      gonder.addEventListener('click', async () => {
        gonder.disabled = true;
        const ok = await this.baglanti
          .geriBildirim({
            site: this.adapter.site,
            puan,
            yorum: yazi.value.trim(),
            gorev_turu: veri.gorev_turu,
            tur_elle_degisti: this.turElleDegisti,
            meta_prompt_surumu: veri.meta_prompt_surumu,
          })
          .catch(() => false);
        this.geriAlani.replaceChildren(
          el('p', 'sp-geri-tesekkur', ok ? '💫 Teşekkürler! Geri bildirimin bize ulaştı.' : '☄️ Gönderilemedi; sunucu kapalı olabilir.'),
        );
      });
      this.geriAlani.replaceChildren(satir, yazi, uyari, gonder);
      satir.querySelectorAll('button').forEach((b) => (b.disabled = true));
      (puan === 'iyi' ? iyi : kotu).classList.add('sp-secili');
      yazi.focus();
    };
    iyi.addEventListener('click', () => notAlani('iyi'));
    kotu.addEventListener('click', () => notAlani('kotu'));
    this.geriAlani.replaceChildren(satir);
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

    // Kullanıcının boşluklara yazdıkları: { "hedef kitle": "lise öğrencileri", ... }
    const degerler: Record<string, string> = {};

    const sec = el('button', 'sp-sec', 'Kullan ➜');
    sec.setAttribute('aria-label', `${s.baslik} seçeneğini kullan`);
    sec.addEventListener('click', () => {
      const kutu = this.adapter.kutuyuBul();
      if (!kutu) return;
      // Doldurulan boşluklar metne yerleşir; boş bırakılanlar [köşeli parantez] olarak kalır
      const sonMetin = bosluklariDoldur(s.prompt, degerler);
      this.orijinal = orijinal; // geri alabilmek için sakla
      this.adapter.metniYaz(kutu, sonMetin);
      this.geriAlBtn.hidden = false;
      this.kapat();
      this.secimiTakipEt(kutu, s, sonMetin, veri, Math.round(performance.now() - this.panelAcilis));
    });

    // Başlık satırı: simge rozeti + başlık/ipucu + Kullan
    const ust = el('div', 'sp-kart-ust');
    const baslik = el('div', 'sp-kart-baslik');
    baslik.append(el('h3', '', s.baslik), el('span', 'sp-ipucu', gorunum.ipucu));
    ust.append(el('span', 'sp-rozet', gorunum.simge), baslik, sec);

    // Prompt metni: [boşluklar] altın renkte vurgulanır; kullanıcı listeye yazdıkça
    // önizleme canlı güncellenir ve doldurulan yer yeşile döner (karar 0004)
    const prompt = el('p', 'sp-prompt');
    const promptuCiz = () => {
      prompt.replaceChildren();
      for (const parca of parcalaraAyir(s.prompt)) {
        if (parca.tur === 'metin') {
          prompt.append(parca.deger);
          continue;
        }
        const yazilan = degerler[parca.deger.slice(1, -1).trim()]?.trim();
        prompt.append(yazilan ? el('mark', 'sp-dolu', yazilan) : el('mark', 'sp-bosluk', parca.deger));
      }
    };
    promptuCiz();
    kart.append(ust, prompt);

    // Doldurulacaklar listesi: her boşluk için bir satır + yazma kutusu (karar 0004, katman 2)
    const bosluklar = bosluklariBul(s.prompt);
    if (bosluklar.length) {
      const liste = el('div', 'sp-doldur-liste');
      const ozet = el('div', 'sp-doldur-baslik', `📝 Doldurman gerekenler (${bosluklar.length})`);
      ozet.title = 'Doldurursan cevap sana daha uygun olur. Boş bırakırsan yapay zekâ kendisi karar verir.';
      liste.append(ozet);
      for (const ad of bosluklar) {
        const satir = el('label', 'sp-doldur-satir');
        const girdi = el('input', 'sp-doldur-girdi');
        girdi.type = 'text';
        girdi.placeholder = 'yaz ya da boş bırak';
        girdi.addEventListener('input', () => {
          degerler[ad] = girdi.value;
          satir.classList.toggle('sp-tamam', girdi.value.trim() !== '');
          promptuCiz();
        });
        // Enter → bu kartı kullan (formu doldurup hızlıca geçebilsin)
        girdi.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') sec.click();
        });
        // Siteler (Gemini, ChatGPT) sayfa genelinde tuş dinler; yazarken tuşlar onlara sızmasın
        for (const olay of ['keydown', 'keyup', 'keypress'] as const) {
          girdi.addEventListener(olay, (e) => e.stopPropagation());
        }
        satir.append(el('span', 'sp-doldur-ad', ad), girdi);
        liste.append(satir);
      }
      kart.append(liste);
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
    yazilanMetin: string, // boşluklar doldurulmuş hâli: "düzenlendi mi" buna göre ölçülür
    veri: { gorev_turu: string; meta_prompt_surumu: string },
    secimSuresi: number,
  ) {
    this.takipBitir?.(); // önceki takip varsa bırak
    let sonMetin = yazilanMetin;
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
        duzenlendi: sonMetin.trim() !== yazilanMetin.trim(),
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
