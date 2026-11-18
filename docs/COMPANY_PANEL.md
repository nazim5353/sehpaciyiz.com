# Sehpacıyız şirket paneli

Yerel çalışma adresi: `http://127.0.0.1:3100/yonetim`.

## Geçici girişsiz önizleme

İstek üzerine `.env.local` içindeki `COMPANY_PANEL_PREVIEW=true` ile yerel panel girişsiz açılır. Bu seçenek yalnızca `LOCAL_PREVIEW=true` iken, üretim dışında ve bilgisayarın loopback / mevcut yerel ağ Host adreslerinde çalışır. `/yonetim/giris` doğrudan panel özetine yönlenir. Şifre / çıkış kontrolleri bu modda gizlenir.

İlk hesap henüz kurulmadıysa oturum açma şifresi bulunmayan bir yerel kayıt sahibi oluşturulur. Girilen kayıtlar aynı şirket veritabanında korunur. Giriş sistemine dönmek için `COMPANY_PANEL_PREVIEW=false` yapılır; kişisel sahip hesabı kurulurken yerel kayıt sahibinin kimliği korunarak hesap dönüştürülür. Daha önce kurulmuş bir sahip hesabı varsa önizleme mevcut kayıtları kullanır.

Panel renkleri mağazanın ortak CSS değişkenlerini kullanır: beyaz yüzeyler, açık gri zemin, antrasit metin ve işlemler. Yazı ailesi mağazayla aynı yerel Manrope fontudur.

## İlk kullanım

1. Mevcut `.env.local` ile `pnpm dev:lan` çalıştırın. Paket yöneticisi yerine doğrudan `node node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port 3100` da kullanılabilir.
2. Aynı bilgisayarda `/yonetim/giris` adresini açın. İlk şirket sahibi hesabınızı ad, e-posta ve en az 12 karakterlik şifreyle oluşturun. Önceden tanımlı hesap veya ortak PIN yoktur.
3. Personel & işlem geçmişi bölümünden kişisel personel hesaplarını açın. Hesabı devre dışı bırakmak ve şifre yenilemek o kişinin açık oturumlarını kapatır.
4. Eski dönem ödemeleri için açılış tarihi uygun olan kasa veya banka hesabını seçin. Başlangıç nakit kasası 01.01.2000 itibarıyla sıfır bakiyeyle açılır; gerçek banka açılışlarını Kasa & banka ekranından ekleyin.

## Çalışan bölümler

- Satış ve tahsilat: web sitesi, Instagram, Trendyol, Hepsiburada, mağaza. Ürünler mevcut 133 ürünlük katalog ve QN kodlarıyla seçilir. Serbest ürün / malzeme satırı da girilebilir.
- Ürün alımları ve malzeme alımları, ayrı kategoride giderler, vergi / resmi ödeme kayıtları.
- Gün, hafta, ay ve özel tarih aralığı; kanal, kayıt türü ve müşteri / belge / ürün araması. Vade takvimi kayıt tarihi yerine vade tarihini kullanır.
- Kısmi tahsilat, kapora, ödeme ve sahibi tarafından iade. Kasa / banka açılışı ve hesaplar arası transfer.
- Birim maliyetler, maliyetin satış anındaki kopyası, eksik maliyet bildirimi. Eski satışların maliyeti güncel katalog maliyetiyle değiştirilmez.
- Personel düzeltme / iptal talepleri, sahibi tarafından onay / ret; sürüm kontrolü. İşlem geçmişi ve CSV kayıt dökümü.
- Mevcut ürün kataloğu ve mağaza ayarları sahibi için korunmuştur.

## Yetkiler ve kayıt güvenliği

Şirket sahibi tüm kayıt, rapor, maliyet, hesap ve kullanıcıları görür. Personel kendi kayıtlarını girer, kendi para hareketlerini ve taleplerini görür. Kayıt düzeltmeleri ve iptalleri onaya gider. Maliyetler, şirket toplamları, diğer kullanıcıların kayıtları ve mağaza ayarları personele gönderilmez. Kontrol yalnızca menüyü gizleyerek yapılmaz; sunucu işlemleri de yetki doğrular.

Şifreler scrypt ile tuzlanarak özetlenir; oturum belirteçlerinin yalnızca SHA-256 özeti saklanır. Oturum 8 saattir. Yazma işlemleri aynı kaynak kontrolü uygular. İlk sahip kurulumu gerçek loopback Host ile sınırlıdır. Finansal tutarlar tam sayı kuruştur. Kayıt ve ödeme gönderimleri işlem anahtarıyla yinelenmeye karşı korunur. Ödemeler, transferler ve işlem geçmişinde doğrudan değiştirme / silme izni yoktur.

## Hesapların anlamı

- Satış tutarı: seçilen kayıt tarihlerindeki etkin satışlar. Güncel kalan ve mahsup tutarları, kayıtların bugün itibarıyla tüm ödemelerini içerir.
- Nakit giriş / çıkış: seçilen tarihte gerçekleşen gerçek para hareketleri. Komisyon ve kargo tahsilattan kesildiyse hesaba yalnızca net tutar girer. Bu kesintileri ikinci kez gider olarak girmeyin.
- Hesap bakiyesi: açılış + bitiş tarihine kadar girişler − çıkışlar + transferler. Tarih aralığının başlangıcından bağımsızdır; kanal filtresi toplam hesap bakiyesini daraltmaz.
- Transfer ve açılış bakiyeleri gelir veya gider değildir.
- Ürün farkı, maliyeti bilinen satış satırlarında satış − indirim − ürün maliyetidir. Diğer giderleri ve vergileri içermez; net kâr adıyla sunulmaz. Alım / gider / vergi toplamı stok muhasebesiyle hesaplanan dönem kârı değildir.
- Vergi oranı, beyanname, e-fatura ve banka / pazaryeri API aktarımı otomatik hesaplanmaz. Tutarlar ve satışlar manuel girilir.
- Ödeme almış bir kaydı iptal etmeden önce iade hareketi girilir. Kısmi satış iadesinde yeni satış tutarı ayrıca düzenlenir; geçmiş para hareketleri korunur.

## Veriler ve çalışma ortamı

Mağaza kataloğu / ayarları mevcut `.local/store.json` dosyasındadır. Şirket kayıtları ayrı `.local/company-pg` dizininde kalıcı PGlite PostgreSQL veritabanında tutulur. Tarayıcı yerel depolaması kullanılmaz. Panel için test verileri gerçek şirket veritabanına eklenmez. Test veritabanı değişkeni `OPS_DB_DIRECTORY`; ayrı Next test çıktısı `OPS_TEST_BUILD=true` ile `.local/ops-next-test` altındadır.

Bu sürüm yerel geliştirme içindir. Canlı kullanım için yönetilen PostgreSQL adaptörü, HTTPS oturumları, sunucu yedekleri ve geri yükleme denemeleri kurulmalıdır. Yerel veritabanı üretim modunda çalışmayı reddeder. Yerel yedek alırken geliştirme sunucusunu durdurup `.local/company-pg` dizinini bütünüyle güvenli bir yere kopyalayın; çalışan veritabanının dosyalarını parça parça kopyalamayın.

Arayüz: referans panelin orman yeşili / krem düzeni, Sehpacıyız Manrope yazı ailesi, uyumlu mobil menü ve erişilebilir modal formlar. UI/UX skill aramasında pazarlama sayfası sonucu geldiği için doğrulanmamış şablon uygulanmadı; kullanıcı referansı ve mevcut marka esas alındı.

## Doğrulama

`node node_modules/tsx/dist/cli.mjs --test tests/operations*.test.ts tests/security.test.ts tests/store.test.ts`

Finans testleri kalıcılığı, tek sahip kurulumunu, kuruş hassasiyetini, ödeme / komisyon / iade hesabını, idempotansı, maliyet geçmişini, tüm sayfalardaki toplamları, personel kapsamını, onay sürüm kontrolünü ve oturum iptalini kontrol eder. Tarayıcı testleri ayrı deneme veritabanında yapılır.
