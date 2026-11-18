# Şirket paneli doğrulaması · 17 Kasım 2026

## Girişsiz önizleme ve mağaza teması güncellemesi

- Yerel önizleme açıkken oturumsuz `/yonetim`, raporlar ve katalog HTTP 200. `/yonetim/giris` doğrudan `/yonetim` adresine yönleniyor.
- Üretim dışında ve açıkça izin verilen yerel Host adreslerinde çalışan önizleme kapısı eklendi. Açık raw HTTP Host testiyle tanınmayan Host isteğinin HTTP 401 aldığı doğrulandı. Farklı kaynaklı yazma halen reddediliyor.
- Önizlemeden kişisel sahip hesabına geçişte kayıt ve kasa kimlikleri korunuyor. Yeni önizleme testleriyle birlikte 12 finans / güvenlik testi geçti; Next.js derlemesi ve TypeScript başarılı.
- Canlı DOM kontrolünde panel ile mağazanın font ailesi ve metin rengi aynı. Panelin ana işlem rengi `rgb(52,58,61)`, mağazanın `--accent: #343a3d` değişkeniyle eşleşiyor. Yeşil panel yüzeyleri beyaz / açık gri / antrasit renklerle değiştirildi.
- 1440px masaüstü ve 390px telefon yerleşimleri kontrol edildi; mobilde yatay sayfa taşması yok. Mobil menü çalışıyor; şifre / çıkış kontrolleri girişsiz önizlemede gösterilmiyor.
- Güncel ekran: `output/company-panel/brand-preview.jpg`. Gerçek panel `/yonetim` özetinde açık bırakıldı.

## İlk sürüm kontrolleri

- Finans, sayfalama, güvenlik ve mağaza kalıcılığı: 11 test, 11 başarılı. Komut: `node node_modules/tsx/dist/cli.mjs --test tests/operations.test.ts tests/operations-pagination.test.ts tests/security.test.ts tests/store.test.ts`.
- Ayrı çıktı dizininde `OPS_TEST_BUILD=true` ile Next.js üretim derlemesi ve TypeScript kontrolü başarılı.
- Üretilen 21 dosya izleme manifestinde şirket veritabanı, özel mağaza dosyası veya `.env` referansı yok.
- İzole deneme sunucusunda 13 sahibi sayfası HTTP 200: özet, satışlar, alımlar, giderler, vergiler, kasa, takvim, raporlar, maliyetler, ekip, onaylar, katalog, genel ayarlar. CSV dışa aktarma başarılı.
- Oturumsuz API erişimi reddedildi. Personel rapor, CSV ve maliyet değiştirme istekleri reddedildi. Farklı kaynaklı yazma reddedildi.
- Tarayıcıda kişisel giriş, gider formu, gider ödeme kaydı, QN-Z339 katalog seçimi ve mobil satış kaydı çalıştırıldı. Personel görünümünde şirket toplamları, maliyetler ve başka kişilerin kayıtları yok.
- 390px telefon görünümü kontrol edildi. Tablonun gizli başlık metninden kaynaklanan dış sayfa taşması giderildi; belge genişliği kullanılabilir görüntü alanıyla aynı.
- Deneme görseli: `output/company-panel/management-test.jpg`. Görseldeki tutarlar yalnızca ayrı QA veritabanına aittir.
- Gerçek yerel giriş ekranı ilk şirket sahibi kurulumu için açık bırakıldı. Şirket veritabanına test hesabı veya test finans kaydı eklenmedi. Mağaza ana sayfası ve yerel ağ girişi HTTP 200 olarak doğrulandı.

Üretim derlemesinin geçmesi canlı PostgreSQL veya otomatik pazaryeri bağlantısı kurulduğu anlamına gelmez. Mevcut yerel çalışma kapsamı ve tutarların anlamı `COMPANY_PANEL.md` dosyasındadır.
