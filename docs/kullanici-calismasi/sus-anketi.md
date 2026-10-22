# SUS anketi (System Usability Scale) + açık uçlu sorular

**Formu elle oluşturmayın:** [google-form/form_olustur.gs](google-form/form_olustur.gs) bu soruların hepsini (onam ve
görüş sorularıyla birlikte) otomatik oluşturur. Aşağısı yalnızca metin hâlidir. Her soru **1 = Kesinlikle katılmıyorum … 5 = Kesinlikle katılıyorum** ölçeğinde.
Form yanıtlarını CSV olarak indirip sütun adlarını `s1` … `s10` yapın; `teknik` sütunu ekleyin (evet/hayır).
Puan hesabı: `python eval/kullanici_calismasi.py --sus yanitlar.csv` (0-100; literatür ortalaması 68).

> Sorular, SUS'un yaygın kullanılan Türkçe uyarlamalarına dayanır. Raporda kullandığınız Türkçe
> uyarlamanın kaynağını belirtin.

| Kod | Soru |
|---|---|
| s1 | Bu eklentiyi sık sık kullanmak isteyeceğimi düşünüyorum. |
| s2 | Eklentiyi gereksiz yere karmaşık buldum. |
| s3 | Eklentinin kullanımının kolay olduğunu düşündüm. |
| s4 | Bu eklentiyi kullanabilmek için teknik bir kişinin desteğine ihtiyaç duyacağımı düşünüyorum. |
| s5 | Eklentideki çeşitli işlevlerin iyi bütünleştirildiğini düşündüm. |
| s6 | Eklentide çok fazla tutarsızlık olduğunu düşündüm. |
| s7 | Çoğu insanın bu eklentiyi kullanmayı çok çabuk öğreneceğini düşünüyorum. |
| s8 | Eklentiyi kullanmayı çok zahmetli buldum. |
| s9 | Eklentiyi kullanırken kendimden çok emin hissettim. |
| s10 | Bu eklentiyi kullanmaya başlamadan önce birçok şey öğrenmem gerekti. |

## Ek sorular
- **teknik:** Yazılım / bilgisayar bilimleri alanında eğitim aldınız mı ya da çalışıyor musunuz? (Evet / Hayır)
- **Yapay zekâ kullanım sıklığı:** Her gün / Haftada birkaç kez / Ayda birkaç kez / Daha az

## Açık uçlu sorular
1. 5 seçenekten en çok hangisini seçtiniz ve neden?
2. "Neden daha iyi" açıklamaları prompt yazma şeklinizi değiştirdi mi? Bir örnek verebilir misiniz?
3. Eklentide neyi değiştirmemizi / eklememizi isterdiniz?
