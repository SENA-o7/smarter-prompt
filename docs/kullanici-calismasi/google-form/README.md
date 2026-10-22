# Kullanıcı çalışması anket formu (Google Forms)

`form_olustur.gs` formu **otomatik oluşturan** bir Google Apps Script. Elle soru girmeye gerek yok.

## Oluşturma (5 dakika, bir kez)
1. Dosyanın başındaki `ILETISIM` ve `EKLENTI_BAGLANTISI` satırlarını doldurun.
2. https://script.google.com → **Yeni proje** → içindeki kodu silip `form_olustur.gs`'nin tamamını yapıştırın → **Kaydet**.
3. Üstte `formuOlustur` seçili → **Çalıştır**.
4. İzin ekranı: hesabınızı seçin → "Google bu uygulamayı doğrulamadı" → **Gelişmiş** → **(güvenli değil) sayfasına git** → **İzin ver**.
   (Kendi hesabınızda kendi kodunuz çalıştığı için güvenli; script yalnızca yeni bir form ve tablo oluşturur.)
5. Alttaki **Yürütme günlüğü**'nde 3 bağlantı çıkar:
   - **KATILIMCI BAĞLANTISI** → katılımcılara gönderin (bit.ly ile kısaltabilirsiniz)
   - **DÜZENLEME BAĞLANTISI** → yalnızca ekip
   - **YANIT TABLOSU** → yanıtların toplandığı Google E-Tablosu

Formu ekip arkadaşlarınızla paylaşmak için: Düzenleme bağlantısı → sağ üstte **⋮ → Ortak çalışan ekle**.

## Formun içeriği
| Bölüm | Sorular | Ne için |
|---|---|---|
| 1. Onam | Onay kutusu (zorunlu), katılımcı kodu (8 karakter, eklenti ayarlarından) | Etik; seçim kayıtları ve 👍/👎 ile eşleştirme |
| 2. Hakkınızda | Teknik mi, yapay zekâ kullanım sıklığı, siteler, kullanım türleri | H5: teknik / teknik olmayan karşılaştırması |
| 3. Kullanılabilirlik | 10 SUS sorusu (1-5) | AS5: SUS puanı (ortalama 68 üstü mü?) |
| 4. Görüşleriniz | En çok kullanılan strateji + neden, boşluk doldurma sıklığı, "öğrenme" etkisi, örnek, iyileştirme, tavsiye | AS3, öğrenme iddiası, iyileştirme listesi |
| 5. Görüşme | 15 dk görüşmeye gönüllü mü? | Görüşme katılımcılarını seçmek |

Form **e-posta toplamaz**, isim sormaz.

## Analiz
E-Tablo → **Dosya → İndir → Virgülle ayrılmış değerler (.csv)** → dosyayı ekip Drive'ına koyun (repoya DEĞİL) →
```bash
server\.venv\Scripts\python eval\kullanici_calismasi.py --sus "indirilen.csv" ^
    --olaylar server\veri\olaylar.jsonl --geri-bildirim server\veri\geri_bildirim.jsonl
```
Soru başlıklarındaki `[s1]`…`[s10]`, `[teknik]` etiketleri sayesinde betik sütunları kendiliğinden tanır.

## Ne zaman gönderilir?
Katılımcı eklentiyi **bir hafta** kullandıktan sonra. Kurulum için önce
[kurulum-talimati.md](../kurulum-talimati.md) gönderilir.
