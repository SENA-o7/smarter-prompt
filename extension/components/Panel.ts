/**
 * PANEL BİLEŞENİ — "Pastel Defter" tasarımı (22.10.2026, Sena'nın seçimi)
 *
 * Düzen: Geliştir butonu → panel. 5 seçenek tek satırlık özet olarak alt alta durur (akordeon);
 * tıklanan satır açılır ve tam prompt, doldurulacaklar listesi, "neden" ve "Bunu kullan" görünür.
 * Böylece kullanıcı 5 seçeneğe kaydırmadan bir bakışta göz atar, yalnızca seçtiğinin ayrıntısını görür.
 *
 * Siteden bağımsızdır; yazı kutusuyla yalnızca adaptör üzerinden konuşur (ChatGPT, Claude, Gemini).
 * Framework yok, düz DOM. Görünüm: entrypoints/content/style.css · Resimler: components/resimler.ts
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
import { resimKutusu } from './resimler';

/** Panelin dış dünyayla konuşma yolları (içerik betiğinde ve demoda farklı verilebilir). */
export type PanelBaglantisi = {
  gelistir(istek: GelistirIstegi): Promise<GelistirCevabi>;
  olayGonder(olay: OlayMesaji['olay']): void;
  /** 👍/👎 geri bildirimi; gönderildiyse true */
  geriBildirim(gb: GeriBildirimMesaji['gb']): Promise<boolean>;
};

/** Her stratejinin satırda görünen kısa açıklaması (resimler: resimler.ts) */
const STRATEJI_IPUCU: Record<Secenek['strateji'], string> = {
  net: 'Kısa ve tek net görev',
  detayli: 'Rol, amaç ve hedef kitle ekler',
  adim_adim: 'Önce plan, sonra çözüm',
  format: 'Çıktının biçimi belli',
  soru: 'Önce eksikleri sorar',
};

/** Tür seçicide görünen adlar (meta-prompt v2 türleri) */
const TUR_GORUNUMU: Record<GorevTuru, string> = {
  kod: '💻 Kod',
  yazi: '✍️ Metin',
  analiz: '📊 Analiz',
  gorsel: '🎨 Görsel',
  ses: '🎵 Ses',
  matematik: '🧮 Matematik',
  diger: '🌀 Diğer',
};

// Beklerken dönen küçük mesajlar (sıkılmasın diye)
const BEKLEME_MESAJLARI = [
  'Kalemler açılıyor…',
  'Beş farklı yol yazılıyor…',
  'Eksik bilgiler aranıyor…',
  'Son rötuşlar yapılıyor…',
];

export class Panel {
  private kutu: HTMLDivElement; // panelin kendisi
  private liste: HTMLDivElement; // seçenek satırları
  private durum: HTMLParagraphElement; // bekleme mesajı, hata, süre bilgisi
  private turAlani: HTMLSpanElement; // başlıktaki "💻 Kod ▾" seçicisi
  private geriAlani: HTMLDivElement; // 👍/👎 geri bildirim
  private geriAlBtn: HTMLButtonElement;
  private dugme: HTMLButtonElement; // sayfadaki "Geliştir" butonu
  private orijinal: string | null = null; // "Geri al" için kullanıcının ilk yazdığı metin
  private calisiyor = false; // aynı anda iki istek gitmesin
  private panelAcilis = 0; // seçim süresini ölçmek için
  private takipBitir: (() => void) | null = null;
  private mesajZamanlayici = 0;
  private turElleDegisti = false; // kullanıcı algılanan türü düzeltti mi (geri bildirimde ölçülür)

  constructor(
    kok: HTMLElement,
    private adapter: SiteAdapter,
    private baglanti: PanelBaglantisi,
  ) {
    // --- Sayfadaki Geliştir butonu ---
    this.dugme = el('button', 'sp-dugme');
    this.dugme.title = 'Prompt\'unu geliştir (Ctrl+Shift+E)';
    this.dugme.append(resimKutusu('logo', 22), el('span', '', 'Geliştir'));
    this.dugme.addEventListener('click', () => this.gelistir());

    // --- Panel ---
    this.kutu = el('div', 'sp-panel');
    this.kutu.hidden = true;
    this.kutu.setAttribute('role', 'dialog');
    this.kutu.setAttribute('aria-label', 'Smarter Prompt seçenekleri');

    // Başlık: logo + ad + tür seçici + Geri al + Kapat
    const ust = el('div', 'sp-ust');
    this.turAlani = el('span', 'sp-tur');
    this.geriAlBtn = el('button', 'sp-ikincil', '↶ Geri al');
    this.geriAlBtn.hidden = true;
    this.geriAlBtn.title = 'Yazı kutusunu ilk yazdığın metne döndür';
    this.geriAlBtn.addEventListener('click', () => this.geriAl());
    const kapat = el('button', 'sp-kapat', '✕');
    kapat.setAttribute('aria-label', 'Kapat');
    kapat.addEventListener('click', () => this.kapat());
    ust.append(resimKutusu('logo', 28), el('b', 'sp-ad', 'Smarter Prompt'), this.turAlani, this.geriAlBtn, kapat);

    this.durum = el('p', 'sp-durum');
    this.durum.setAttribute('aria-live', 'polite'); // ekran okuyucular durum değişimini okusun
    this.liste = el('div', 'sp-liste');
    this.geriAlani = el('div', 'sp-geri');
    const icerik = el('div', 'sp-icerik');
    icerik.append(this.durum, this.liste);
    this.kutu.append(ust, icerik, this.geriAlani);
    kok.append(this.kutu, this.dugme);

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
    this.geriAlani.replaceChildren();
    if (!zorunluTur) {
      this.turElleDegisti = false;
      this.turAlani.replaceChildren();
    }
    if (!metin) {
      this.durum.textContent = '✏️ Önce yazı kutusuna kısa bir prompt yaz, sonra tekrar dene.';
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
      this.durum.textContent = `😕 ${cevap.hata}`;
      this.liste.replaceChildren();
      return;
    }
    const { eksik_bilgiler, secenekler, sure_ms, model } = cevap.veri;
    // Ör: "5 yol hazır · 4.4 sn · birine tıkla, ayrıntısı açılsın"
    this.durum.textContent =
      `5 yol hazır · ${(sure_ms / 1000).toFixed(1)} sn` +
      (model.startsWith('yerel') ? ' · yerel model' : '') +
      ' · birine tıkla, ayrıntısı açılsın';
    if (eksik_bilgiler.length) this.durum.title = `Eksik bilgiler: ${eksik_bilgiler.join(', ')}`;
    this.panelAcilis = performance.now();
    const satirlar = secenekler.map((s, i) => this.satir(s, i, metin, cevap.veri));
    this.liste.replaceChildren(...satirlar);
    satirlar[0]?.querySelector<HTMLButtonElement>('.sp-satir-bas')?.click(); // ilkini açık göster
    this.turSeciciyiCiz(cevap.veri.gorev_turu);
    this.geriBildirimiCiz(cevap.veri);
  }

  /**
   * Başlıktaki "💻 Kod ▾" — model türü otomatik bulur; yanlışsa kullanıcı tek tıkla değiştirir ve
   * 5 seçenek o türe göre yeniden üretilir (meta-prompt v2, karar 0005). Her seferinde
   * "ne için kullanacaksın?" diye sormuyoruz: kısa prompt yazan kullanıcıyı yavaşlatır.
   */
  private turSeciciyiCiz(tur: GorevTuru) {
    const secim = el('select', 'sp-tur-sec');
    secim.setAttribute('aria-label', 'Algılanan görev türü; değiştirirsen seçenekler yeniden üretilir');
    secim.title = this.turElleDegisti ? 'Senin seçtiğin tür' : 'Algılanan tür — yanlışsa değiştir';
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
    this.turAlani.replaceChildren(secim);
  }

  /** Panelin altı: "İşine yaradı mı? 👍 👎" → isteğe bağlı not → gönder. */
  private geriBildirimiCiz(veri: EnhanceResponse) {
    const soru = el('span', 'sp-geri-soru', 'İşine yaradı mı?');
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
      tuslariSiteyeSizdirma(yazi);
      const uyari = el('small', 'sp-geri-uyari', 'Kişisel bilgi (isim, e-posta, şifre) yazma.');
      const gonder = el('button', 'sp-geri-gonder', 'Gönder');
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
          el(
            'p',
            'sp-geri-tesekkur',
            ok ? '🧡 Teşekkürler! Geri bildirimin bize ulaştı.' : '😕 Gönderilemedi; sunucu kapalı olabilir.',
          ),
        );
      });
      const alt = el('div', 'sp-geri-alt');
      alt.append(uyari, gonder);
      this.geriAlani.replaceChildren(satir, yazi, alt);
      satir.querySelectorAll('button').forEach((b) => (b.disabled = true));
      (puan === 'iyi' ? iyi : kotu).classList.add('sp-secili');
      yazi.focus();
    };
    iyi.addEventListener('click', () => notAlani('iyi'));
    kotu.addEventListener('click', () => notAlani('kotu'));
    this.geriAlani.replaceChildren(satir);
  }

  /** Beklerken: dönen mesaj + yer tutucu satırlar. */
  private beklemeyiGoster() {
    let i = 0;
    this.durum.textContent = BEKLEME_MESAJLARI[0]!;
    this.mesajZamanlayici = window.setInterval(() => {
      i = (i + 1) % BEKLEME_MESAJLARI.length;
      this.durum.textContent = BEKLEME_MESAJLARI[i]!;
    }, 1800);
    this.dugme.classList.add('sp-calisiyor');
    this.liste.replaceChildren(
      ...Array.from({ length: 5 }, (_, n) => {
        const yer = el('div', 'sp-satir sp-yer-tutucu');
        yer.style.setProperty('--sira', String(n));
        const metin = el('div', 'sp-yer-metin');
        metin.append(el('div', 'sp-cizgi sp-kisa'), el('div', 'sp-cizgi'));
        yer.append(el('div', 'sp-yer-res'), metin);
        return yer;
      }),
    );
  }

  private beklemeyiBitir() {
    window.clearInterval(this.mesajZamanlayici);
    this.dugme.classList.remove('sp-calisiyor');
  }

  /**
   * Tek bir seçenek satırı (akordeon). Kapalıyken: resim + başlık + prompt'un tek satırlık özeti.
   * Açıkken: tam prompt (boşluklar vurgulu), doldurulacaklar listesi, "neden" ve "Bunu kullan".
   */
  private satir(
    s: Secenek,
    sira: number,
    orijinal: string,
    veri: { gorev_turu: string; meta_prompt_surumu: string },
  ) {
    const satir = el('article', 'sp-satir');
    satir.dataset.strateji = s.strateji;
    satir.style.setProperty('--sira', String(sira)); // satırlar sırayla belirsin
    const govdeId = `sp-govde-${s.strateji}`;

    // --- Başlık (tıklanabilir) ---
    const bas = el('button', 'sp-satir-bas');
    bas.setAttribute('aria-expanded', 'false');
    bas.setAttribute('aria-controls', govdeId);
    const yazi = el('span', 'sp-satir-yazi');
    // Kapalıyken prompt'un özeti, açıkken stratejinin kısa açıklaması görünür (CSS ile değişir)
    yazi.append(
      el('span', 'sp-satir-baslik', s.baslik),
      el('span', 'sp-satir-ozet', s.prompt),
      el('span', 'sp-ipucu', STRATEJI_IPUCU[s.strateji]),
    );
    bas.append(resimKutusu(s.strateji, 44), yazi, el('span', 'sp-ok', '›'));

    // --- Gövde (açılınca görünür) ---
    const govde = el('div', 'sp-satir-govde');
    govde.id = govdeId;
    govde.hidden = true;

    // Kullanıcının boşluklara yazdıkları: { "hedef kitle": "lise öğrencileri", ... }
    const degerler: Record<string, string> = {};

    // Prompt metni: [boşluklar] sarı vurgulu; doldurdukça önizleme yeşile döner (karar 0004)
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
    govde.append(prompt);

    const kullan = el('button', 'sp-kullan', 'Bunu kullan →');
    kullan.addEventListener('click', () => {
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

    // Doldurulacaklar: her boşluk için etiket + yazma kutusu (karar 0004, katman 2)
    const bosluklar = bosluklariBul(s.prompt);
    if (bosluklar.length) {
      const alan = el('div', 'sp-doldur');
      alan.append(el('div', 'sp-doldur-baslik', `✏️ Doldurursan cevap sana daha uygun olur (${bosluklar.length})`));
      for (const ad of bosluklar) {
        const etiket = el('label', 'sp-doldur-satir');
        const girdi = el('input', 'sp-doldur-girdi');
        girdi.type = 'text';
        girdi.placeholder = 'yaz ya da boş bırak';
        girdi.addEventListener('input', () => {
          degerler[ad] = girdi.value;
          etiket.classList.toggle('sp-tamam', girdi.value.trim() !== '');
          promptuCiz();
        });
        // Enter → bu seçeneği kullan (formu doldurup hızlıca geçebilsin)
        girdi.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') kullan.click();
        });
        tuslariSiteyeSizdirma(girdi);
        etiket.append(el('span', 'sp-doldur-ad', ad), girdi);
        alan.append(etiket);
      }
      govde.append(alan);
    }
    govde.append(el('p', 'sp-neden', `💡 ${s.neden}`), kullan);

    // Aç / kapat: aynı anda yalnızca bir satır açık kalsın
    bas.addEventListener('click', () => {
      const acilacak = govde.hidden;
      for (const diger of this.liste.querySelectorAll<HTMLElement>('.sp-satir.sp-acik')) {
        diger.classList.remove('sp-acik');
        diger.querySelector<HTMLElement>('.sp-satir-govde')!.hidden = true;
        diger.querySelector('.sp-satir-bas')!.setAttribute('aria-expanded', 'false');
      }
      govde.hidden = !acilacak;
      satir.classList.toggle('sp-acik', acilacak);
      bas.setAttribute('aria-expanded', String(acilacak));
    });

    satir.append(bas, govde);
    return satir;
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

/** Siteler (Gemini, ChatGPT) sayfa genelinde tuş dinler; panelde yazarken tuşlar onlara sızmasın. */
function tuslariSiteyeSizdirma(alan: HTMLElement) {
  for (const olay of ['keydown', 'keyup', 'keypress'] as const) {
    alan.addEventListener(olay, (e) => e.stopPropagation());
  }
}

/** Küçük yardımcı: etiket + CSS sınıfı + metinle element oluşturur. */
function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = '', metin = '') {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin; // textContent: HTML enjeksiyonuna karşı güvenli
  return e;
}
