/**
 * SMARTER PROMPT — KULLANICI ÇALIŞMASI FORMUNU OTOMATİK OLUŞTURUR (Google Apps Script)
 *
 * Nasıl kullanılır (5 dakika):
 *   1. https://script.google.com → "Yeni proje"
 *   2. Bu dosyanın TAMAMINI kopyalayıp oradaki kodun yerine yapıştırın → Kaydet (Ctrl+S)
 *   3. Üstteki fonksiyon listesinden "formuOlustur" seçili olsun → "Çalıştır"
 *   4. İlk seferde Google izin ister ("Bu uygulama Google tarafından doğrulanmadı" → Gelişmiş → Git) — kendi hesabınızda
 *      kendi kodunuz olduğu için güvenli.
 *   5. Alttaki "Yürütme günlüğü"nde iki bağlantı çıkar:
 *        - KATILIMCI BAĞLANTISI → katılımcılara gönderin
 *        - DÜZENLEME BAĞLANTISI → ekip formu buradan düzenler, yanıtları görür
 *      Form ve yanıt tablosu (Google E-Tablolar) Google Drive'ınızda oluşur.
 *
 * Yanıtları analiz etmek: E-Tablo → Dosya → İndir → CSV → python eval/kullanici_calismasi.py --sus yanitlar.csv
 * (Soru başlıklarındaki [s1]…[s10] ve [teknik] etiketleri sayesinde betik sütunları kendisi tanır.)
 *
 * Gizlilik: Form e-posta TOPLAMAZ. İsim sorulmaz; eşleştirme eklentideki rastgele 8 karakterlik katılımcı koduyla yapılır.
 */

const FORM_BASLIGI = 'Smarter Prompt — Kullanıcı Çalışması';
// Ekip bilgileri: göndermeden önce doldurun
const ILETISIM = '[Ekip üyesi adı, e-posta] · Danışman: [Hoca adı, e-posta]';
const EKLENTI_BAGLANTISI = '[GitHub Release bağlantısı]';

function formuOlustur() {
  const form = FormApp.create(FORM_BASLIGI);
  form
    .setDescription(
      'Bu form, Smarter Prompt tarayıcı eklentisini bir hafta kullandıktan sonra doldurulur (yaklaşık 7 dakika).\n' +
        'Eklenti: ' + EKLENTI_BAGLANTISI + '\n\n' +
        'Yazdığınız prompt metinleri hiçbir yerde kaydedilmez. Bu form e-posta adresinizi toplamaz.',
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false) // Google hesabı zorunlu olmasın
    .setProgressBar(true)
    .setConfirmationMessage(
      '💫 Teşekkürler! Yanıtınız kaydedildi. Görüşmeye gönüllüyseniz ekip katılımcı kodunuzla size ulaşacak.',
    );

  // ── 1. Bölüm: Bilgilendirilmiş onam ─────────────────────────────────────────
  form.addSectionHeaderItem().setTitle('1. Bilgilendirilmiş onam').setHelpText(
    'Amaç: Smarter Prompt eklentisinin kullanışlılığını ve hangi prompt geliştirme stratejilerinin tercih edildiğini anlamak.\n\n' +
      'Toplanan: Eklentide seçtiğiniz strateji, görev türü, seçtikten sonra metni değiştirip değiştirmediğiniz, seçim süresi ' +
      '(yalnızca ayarlardan onay verdiyseniz); panelde 👍/👎 ile gönderdiğiniz isteğe bağlı notlar; bu formdaki yanıtlar.\n' +
      'Toplanmayan: Yazdığınız prompt\'ların ve yapay zekâ cevaplarının metni, adınız, e-postanız.\n\n' +
      'Not: Eklentiyi kullandığınızda prompt metni geliştirilmek üzere sunucumuza ve yapay zekâ sağlayıcısına (Google Gemini) ' +
      'gönderilir ama kaydedilmez. Hassas bilgi (TC kimlik no, sağlık, şifre) içeren metinlerde kullanmayınız.\n\n' +
      'Katılım gönüllüdür; istediğiniz zaman gerekçe göstermeden çekilebilirsiniz. Ham veriler yalnızca ekipte saklanır, ' +
      'raporda yalnızca toplu ve anonim sonuçlar yer alır (6698 sayılı KVKK).\n\nİletişim: ' + ILETISIM,
  );
  form
    .addCheckboxItem()
    .setTitle('Onay')
    .setChoiceValues(['Yukarıdaki bilgileri okudum, anladım ve çalışmaya gönüllü olarak katılmayı kabul ediyorum.'])
    .setRequired(true);
  form
    .addTextItem()
    .setTitle('Katılımcı kodu')
    .setHelpText('Eklenti simgesi → Seçenekler → "Kullanıcı çalışması" bölümündeki 8 karakterlik kod (ör. 3f2a9c1b).')
    .setValidation(
      FormApp.createTextValidation()
        .requireTextMatchesPattern('^[0-9a-fA-F]{8}$')
        .setHelpText('8 karakterlik kodu (0-9, a-f) ayarlar sayfasından kopyalayın.')
        .build(),
    )
    .setRequired(true);

  // ── 2. Bölüm: Hakkınızda ───────────────────────────────────────────────────
  form.addPageBreakItem().setTitle('2. Hakkınızda');
  form
    .addMultipleChoiceItem()
    .setTitle('[teknik] Yazılım / bilgisayar alanında eğitim aldınız mı ya da bu alanda çalışıyor musunuz?')
    .setChoiceValues(['Evet', 'Hayır'])
    .setRequired(true);
  form
    .addMultipleChoiceItem()
    .setTitle('[siklik] Yapay zekâ sohbet araçlarını ne sıklıkla kullanırsınız?')
    .setChoiceValues(['Her gün', 'Haftada birkaç kez', 'Ayda birkaç kez', 'Daha az'])
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle('[siteler] Eklentiyi hangi sitelerde kullandınız?')
    .setChoiceValues(['ChatGPT', 'Claude', 'Gemini'])
    .showOtherOption(true)
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle('[turler] Eklentiyi en çok ne için kullandınız?')
    .setChoiceValues(['Kod', 'Metin / yazı', 'Analiz', 'Görsel üretimi', 'Ses / müzik', 'Matematik'])
    .showOtherOption(true);

  // ── 3. Bölüm: SUS (System Usability Scale) ─────────────────────────────────
  // Standart 10 soru; tek numaralılar olumlu, çift numaralılar olumsuz ifadedir (puanlama betikte).
  form
    .addPageBreakItem()
    .setTitle('3. Kullanılabilirlik')
    .setHelpText('Her ifadeye ne kadar katıldığınızı işaretleyin. Doğru ya da yanlış cevap yok; aracı değerlendiriyoruz, sizi değil.');
  const SUS = [
    'Bu eklentiyi sık sık kullanmak isteyeceğimi düşünüyorum.',
    'Eklentiyi gereksiz yere karmaşık buldum.',
    'Eklentinin kullanımının kolay olduğunu düşündüm.',
    'Bu eklentiyi kullanabilmek için teknik bir kişinin desteğine ihtiyaç duyacağımı düşünüyorum.',
    'Eklentideki çeşitli işlevlerin iyi bütünleştirildiğini düşündüm.',
    'Eklentide çok fazla tutarsızlık olduğunu düşündüm.',
    'Çoğu insanın bu eklentiyi kullanmayı çok çabuk öğreneceğini düşünüyorum.',
    'Eklentiyi kullanmayı çok zahmetli buldum.',
    'Eklentiyi kullanırken kendimden çok emin hissettim.',
    'Bu eklentiyi kullanmaya başlamadan önce birçok şey öğrenmem gerekti.',
  ];
  SUS.forEach((ifade, i) => {
    form
      .addScaleItem()
      .setTitle(`[s${i + 1}] ${ifade}`)
      .setBounds(1, 5)
      .setLabels('Kesinlikle katılmıyorum', 'Kesinlikle katılıyorum')
      .setRequired(true);
  });

  // ── 4. Bölüm: Stratejiler ve görüşler ──────────────────────────────────────
  form.addPageBreakItem().setTitle('4. Görüşleriniz');
  form
    .addMultipleChoiceItem()
    .setTitle('[strateji] 5 seçenekten en çok hangisini kullandınız?')
    .setChoiceValues(['⚡ Net ve kısa', '🔭 Detaylı', '🪜 Adım adım', '🧩 Format odaklı', '💬 Önce soru', 'Hatırlamıyorum'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('[neden_strateji] Neden en çok o seçeneği kullandınız?');
  form
    .addScaleItem()
    .setTitle('[bosluk] Köşeli parantezli boşlukları ([hedef kitle] gibi) ne sıklıkla doldurdunuz?')
    .setBounds(1, 5)
    .setLabels('Hiç', 'Her zaman');
  form
    .addScaleItem()
    .setTitle('[ogrenme] "Neden daha iyi" açıklamaları, kendi prompt\'larımı daha iyi yazmayı öğrenmeme yardımcı oldu.')
    .setBounds(1, 5)
    .setLabels('Kesinlikle katılmıyorum', 'Kesinlikle katılıyorum');
  form.addParagraphTextItem().setTitle('[ornek] Bir hafta sonunda prompt yazma şekliniz değişti mi? Bir örnek verebilir misiniz?');
  form.addParagraphTextItem().setTitle('[iyilestirme] Eklentide neyi değiştirmemizi ya da eklememizi isterdiniz?');
  form
    .addMultipleChoiceItem()
    .setTitle('[oneri] Bu eklentiyi bir arkadaşınıza önerir miydiniz?')
    .setChoiceValues(['Kesinlikle', 'Muhtemelen', 'Emin değilim', 'Muhtemelen hayır', 'Kesinlikle hayır']);

  // ── 5. Bölüm: Görüşme ─────────────────────────────────────────────────────
  form.addPageBreakItem().setTitle('5. Kısa görüşme (isteğe bağlı)');
  form
    .addMultipleChoiceItem()
    .setTitle('[gorusme] 15 dakikalık kısa bir görüşmeye katılmak ister misiniz?')
    .setHelpText('Evet derseniz ekip size katılımcı kodunuz üzerinden (eklentiyi dağıttığı kanaldan) ulaşır.')
    .setChoiceValues(['Evet', 'Hayır'])
    .setRequired(true);

  // Yanıtlar otomatik olarak bir Google E-Tablosuna da yazılsın (CSV indirmek için)
  const tablo = SpreadsheetApp.create(FORM_BASLIGI + ' (Yanıtlar)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, tablo.getId());

  Logger.log('KATILIMCI BAĞLANTISI (katılımcılara gönderin): ' + form.getPublishedUrl());
  Logger.log('DÜZENLEME BAĞLANTISI (yalnızca ekip): ' + form.getEditUrl());
  Logger.log('YANIT TABLOSU: ' + tablo.getUrl());
}
