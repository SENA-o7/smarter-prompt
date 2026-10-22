# Kullanıcı çalışması (8. hafta; AS3, AS5)

> ⚠️ Başlamadan önce **hocanıza danışın**: insan katılımcılı çalışmalar için etik kurul onayı gerekebilir.

## Özet
| | |
|---|---|
| Katılımcı | 12-15 kişi, **teknik olmayanlar dahil** (yaklaşık yarı yarıya) |
| Süre | 1. gün 5 standart görev (≈20 dk) + 1 hafta serbest kullanım + SUS anketi + 3-4 kişiyle 15 dk görüşme |
| Kaydedilen | Seçilen strateji, görev türü, göndermeden önce düzenlendi mi, seçim süresi. **Prompt metni kaydedilmez.** |
| Ham veri | Yalnızca ekip Drive'ı. Repoya yalnızca toplu, anonim özet (`data/user_study/ozet_anonim.csv`). |

## Dosyalar
| Dosya | Ne için |
|---|---|
| [onam-formu.md](onam-formu.md) | Bilgilendirilmiş onam formu (imzalatılacak / Google Forms'a aktarılacak) |
| [kurulum-talimati.md](kurulum-talimati.md) | Katılımcı kurulumu: **Yol A** hazır zip (herkes), **Yol B** GitHub + Docker (bilgisayar öğrencileri) |
| [gorevler.md](gorevler.md) | 1. gün yapılacak 5 standart görev |
| [sus-anketi.md](sus-anketi.md) | SUS (10 soru) + açık uçlu sorular (metin hâli) |
| [google-form/](google-form/) | **Anket formunu tek tıkla oluşturan Google Apps Script** (onam + SUS + görüşler) ve kullanım rehberi |
| [gorusme-rehberi.md](gorusme-rehberi.md) | 15 dakikalık yarı yapılandırılmış görüşme soruları |
| [geri-bildirim.md](geri-bildirim.md) | **Geri bildirim kanalları, nerede toplandığı, haftalık iyileştirme döngüsü** |

## Adım adım
1. **6. hafta:** Katılımcı listesi (isimler yalnızca ekip Drive'ında). Teknik / teknik olmayan dengesi.
2. **Sunucu:** Herkesin erişebileceği bir adrese taşıyın (ör. Render, Hugging Face Spaces) ve
   `extension/lib/config.ts` + `wxt.config.ts → host_permissions` güncelleyin. Ya da çalışmayı
   katılımcılarla aynı ağda / yüz yüze yapın.
3. **Eklenti zip'i:** `git tag v0.7.0 && git push origin v0.7.0` → GitHub Release'teki zip.
4. **1. gün:** Onam formu → kurulum → ayarlardan **"Araştırmaya katılmayı kabul ediyorum"** kutusu → 5 görev.
5. **1 hafta:** Serbest kullanım. Seçimler sunucuda `server/veri/olaylar.jsonl`'e anonim yazılır.
6. **Hafta sonu:** SUS anketi (Google Forms) + 3-4 kişiyle görüşme (notlar Drive'a, isimsiz).
7. **Analiz:**
   ```bash
   python eval/kullanici_calismasi.py --olaylar server/veri/olaylar.jsonl --sus sus_yanitlari.csv
   ```
   SUS CSV'sinde sütunlar: `s1`..`s10` (1-5) ve `teknik` (evet/hayır).

## Bilinen kısıtlar (rapora yazılacak)
- Küçük örneklem (n ≈ 13): sonuçlar genellenirken dikkatli olunmalı.
- "Düzenlendi mi" bilgisi yazı kutusunun boşalmasıyla tahmin edilir; kullanıcı metni silerse "gönderildi" sanılır.
- Katılımcılar ekibin tanıdıkları olabilir (seçim yanlılığı); SUS skorları olumlu yönde şişebilir.
