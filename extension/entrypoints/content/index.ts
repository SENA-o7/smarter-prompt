/**
 * İÇERİK BETİĞİ (content script)
 *
 * ChatGPT sayfasının İÇİNDE çalışır. Yaptıkları:
 *  - Sağ alt köşeye "✨ Geliştir" butonu ekler.
 *  - Butona (veya Ctrl+Shift+E) basılınca yazı kutusundaki metni okur,
 *    arka plan betiğine gönderir, gelen 5 seçeneği kart olarak gösterir.
 *  - "Kullan" denince seçilen prompt'u yazı kutusuna yazar; "Geri al" eskisini geri koyar.
 *  - Prompt'u ASLA kullanıcı adına göndermez; son karar her zaman kullanıcıda.
 *
 * Arayüz Shadow DOM içinde çizilir: ChatGPT'nin CSS'i panelimizi bozamaz,
 * bizim CSS'imiz de ChatGPT'yi bozamaz.
 */
import './style.css';
import { chatgptAdapter } from '../../adapters/chatgpt';
import type { SiteAdapter } from '../../adapters/types';
import type { GelistirCevabi, GelistirIstegi, Secenek } from '../../lib/schema';

// MVP: yalnızca ChatGPT. Claude ve Gemini adaptörleri 5-6. haftada eklenecek;
// o zaman burada location.hostname'e göre doğru adaptör seçilecek.
const ADAPTER: SiteAdapter = chatgptAdapter;

export default defineContentScript({
  // Betiğin hangi sayfalarda çalışacağı
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  // style.css sayfaya değil, bizim Shadow DOM'umuza enjekte edilsin
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'smarter-prompt-ui',
      position: 'inline',
      anchor: 'body',
      onMount(kok) {
        const panel = new Panel(kok, ADAPTER);
        // Arka plan betiği kısayol mesajı gönderirse butona basılmış gibi davran
        browser.runtime.onMessage.addListener((m: { tur?: string }) => {
          if (m?.tur === 'kisayol') panel.gelistir();
        });
        return panel;
      },
    });
    ui.mount();
  },
});

/** Buton + 5 kartlı panel. MVP'de framework yok, düz DOM ile yazıldı. */
class Panel {
  private kutu: HTMLDivElement; // panelin kendisi
  private liste: HTMLDivElement; // kartların bulunduğu alan
  private durum: HTMLParagraphElement; // "Geliştiriliyor…", hata mesajı, süre bilgisi
  private geriAlBtn: HTMLButtonElement;
  private orijinal: string | null = null; // "Geri al" için kullanıcının ilk yazdığı metin
  private calisiyor = false; // aynı anda iki istek gitmesin

  constructor(
    kok: HTMLElement,
    private adapter: SiteAdapter,
  ) {
    const buton = el('button', 'sp-ana-buton', '✨ Geliştir');
    buton.title = 'Ctrl+Shift+E';
    buton.addEventListener('click', () => this.gelistir());

    this.kutu = el('div', 'sp-panel');
    this.kutu.hidden = true;

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
    this.liste = el('div', 'sp-liste');
    this.kutu.append(ust, this.durum, this.liste);
    kok.append(this.kutu, buton);
  }

  /** Yazı kutusundaki metni sunucuya gönderip seçenekleri gösterir. */
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
    const istek: GelistirIstegi = { tur: 'gelistir', prompt: metin, site: this.adapter.site };
    let cevap: GelistirCevabi;
    try {
      cevap = await browser.runtime.sendMessage(istek);
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
    const { eksik_bilgiler, secenekler, sure_ms } = cevap.veri;
    // Ör: "2.1 sn · Eksik: programlama dili, programın amacı"
    this.durum.textContent =
      `${(sure_ms / 1000).toFixed(1)} sn` + (eksik_bilgiler.length ? ` · Eksik: ${eksik_bilgiler.join(', ')}` : '');
    this.liste.replaceChildren(...secenekler.map((s) => this.kart(s, metin)));
  }

  /** Tek bir seçenek kartı: başlık, "Kullan" butonu, prompt metni ve "neden daha iyi". */
  private kart(s: Secenek, orijinal: string): HTMLElement {
    const kart = el('article', 'sp-kart');
    const sec = el('button', 'sp-sec', 'Kullan');
    sec.addEventListener('click', () => {
      const kutu = this.adapter.kutuyuBul();
      if (!kutu) return;
      this.orijinal = orijinal; // geri alabilmek için sakla
      this.adapter.metniYaz(kutu, s.prompt);
      this.geriAlBtn.hidden = false;
      this.kutu.hidden = true;
      // TODO (hafta 7, K1): kullanıcı onay verdiyse anonim seçim kaydı → POST /event
    });
    const baslik = el('div', 'sp-kart-ust');
    baslik.append(el('h3', '', s.baslik), sec);
    kart.append(baslik, el('p', 'sp-prompt', s.prompt), el('p', 'sp-neden', s.neden));
    return kart;
  }

  /** Kullanıcının ilk yazdığı metni yazı kutusuna geri koyar. */
  private geriAl() {
    const kutu = this.adapter.kutuyuBul();
    if (!kutu || this.orijinal === null) return;
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
