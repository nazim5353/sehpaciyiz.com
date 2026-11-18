GATE: OPEN 61 (rounds used up)

# Yerel mağaza arayüzü kontrol raporu

16 Kasım 2026. Tasarım planı ve kaynak kararları: [REDESIGN.md](../docs/REDESIGN.md).

## Doğrulanmış sonuçlar

- Son kaynaklarla Next.js üretim derlemesi başarılı; TypeScript aşaması geçti.
- Mevcut 10 test başarılı; stok sınırı, fiyat hesabı, oturum, Origin kontrolü, şifreleme ve yerel kayıt kalıcılığı doğrulandı.
- Koleksiyonun kategori, fiyat, indirim ve hazır stok sorguları beklenen sayıda ürün döndürüyor.
- Renk içeren ürün bağlantısı doğru varyantı açıyor; Ceviz seçimi 4.490 TL ve 14 iş günü üretim bilgisini gösteriyor. Sepet API’si aynı fiyatı sunucudan hesaplıyor.
- Oturumsuz yönetim isteği giriş sayfasına yönleniyor.
- Son tasarım denetiminde 1440 ve 390 genişliklerinde yatay taşma, üst üste binen kontroller, dokunma hedefi, erişilebilir kontrol adı, metin kontrastı ve görünür klavye odağı kontrollerinde FAIL yok. Denetimin tümü geçti olarak değerlendirilmedi.
- Temel CSS, font ve yerel modüller 200 yanıtı veriyor. Sunucu yalnızca 127.0.0.1:3100 üzerinde çalışıyor.

## Tasarım denetiminin açık kalma nedeni

Kullanıcı Maqhome benzeri bilgiye hızlı erişilen bir mağaza istedi. Kullanılan tasarım denetimi ise her bölümü tam ekran boyunda, her ürün kartını farklı bir kompozisyonda ve ürün fotoğraflarını sayfada yalnızca bir defa bekliyor. E-ticaretin kategori kartları, karşılaştırılabilir ürün listesi, kısa fayda şeridi, filtre formu ve SSS yapısı bu beklentilere uymuyor. Kısa içerikleri tam ekranlara uzatmak kullanıcının talep ettiği kullanım kolaylığını azaltacağından mevcut mağaza düzeni korunmuştur.

Açık 61 bulgunun tamamı ve konumları aşağıda listelenir. Denetim yeşil gösterilmedi; kontrol dosyaları değiştirilmedi. Üç açıkça gerekçelendirilmiş istisna ayrıca kayıtlıdır.

## Hareket ve görseller

Tek seferlik açılış hareketi, bağlantı/düğme geri bildirimi ve bir adet word-highlight tipografi bölümü kullanıldı. Hareket azaltma tercihi desteklenir. WebGL, otomatik kayan kampanya, zamanlayıcı veya sahte müşteri yorumu eklenmedi. Mevcut altı katalog varlığı kullanıldı; yeni stok fotoğrafı veya referans sitenin görselleri alınmadı.

## Sınırlar

Bu yerel bir tasarım önizlemesidir. Ürün, renk ve teknik katalog bilgileri mevcut örnek verilerdir. Gerçek ödeme, sipariş oluşturma veya yeni üretim veritabanı adaptörü bu iş kapsamında eklenmedi. Üretim derlemesinin başarılı olması canlı e-ticaretin tamamlandığı anlamına gelmez. Open Graph taban adresi yerel önizlemeyi gösterir; canlıya geçişte gerçek alan adı tanımlanmalıdır. Ürün fotoğrafları gerçek katalogla eşleştirilmelidir; özellikle renk fotoğrafları mevcut değildir.

Windows kontrolünde Tailwind’in geçici tarayıcı profilini taraması dosya kilidine yol açtı; kaynak taraması src dizinine sınırlandırıldı. Ayrı olarak Turbopack’in eski geliştirme önbelleğinde globals.css yerine mağaza CSS çıktısı gözlendi. Kaynakların bağımsız PostCSS çıktısı doğru bulundu; önbellek yedeklenip temiz sunucu açıldıktan sonra hem masaüstü hem mobil görünüm ve kök CSS tekrar doğrulandı. Son üretim derlemesinden sonra da kök CSS yeniden kontrol edildi.

## Metin denetimi

copy-lint: 0 FAIL, 2 WARN. Ürün/kategori sayıları gerçek katalogdan ve sepetten gelir; istatistik veya satış kanıtı olarak kullanılmaz. Bölüm üstü kısa etiketler alışveriş bölümlerini ayırt etmeyi kolaylaştırmak için korundu.

## Denetimden açık kalan bulgular

- **hero-fill** — main#main > div.benefits.container "Hayatınıza uyum sağlar Günlük kullanım i": the next section shows on the first screen: it starts at 750px on a 900px screen (the hero ends at 750px)
- **flush** — main#main > section.hero.container > div.hero-image > img "img: Doğal meşe oval sehpanın yer aldığı": its last line sits 0px above the lower edge of section.hero.container, where the ground changes to div.benefits.container
- **text-only** — main#main > section.shop-section.container:nth-of-type(8) "Sehpana karar vermeden.": the closing section is only text: no picture, icon, mock or effect in it
- **copy-headline** — main#main > section.hero.container > div.hero-copy > h1 "Evinize yakışır. Bütçenize uyar.": "Evinize yakışır. Bütçenize uyar." does not name what is sold (sehpa ve ev mobilyas, sehpa, mobilyas, from flags); only the line under it does
- **copy-headings** — section#kategoriler > div.section-heading > div > h2 "Senin evin, senin tarzın.": "Senin evin, senin tarzın." names no product, part, place or section (5 headings like it; at most one brand line per page) (and 4 more like it: "Yer açmak isteyeceğin ta", "Tarzına da, bütçene de.", "Sen söyle, biz daraltalı", "Beğendiğin tasarım, daha")
- **heading-scale** — main#main > section.shop-section.container:nth-of-type(6) > div > h2 "Sen söyle, biz daraltalım.": h2 headings in 4 sizes, 27px ("Beğendiğin tasarım, daha") to 37.4px (x1.39)
- **section-gaps** — main#main > section.hero.container / main#main > div.benefits.container: 28px between these sections, -65% against the median 81px
- **product-shown** — main#main > section.hero.container > div.hero-image > img "img: Doğal meşe oval sehpanın yer aldığı": the hero's product is drawn 711 x 548px, 56% of the 1267px content width at 1440px (its img is 711px wide): a product page shows the product at 80% of the content width or more (under 60% FAILs)
- **section-tile** — section#kategoriler "Senin evin, senin tarzın.": the section is 559px tall (0.62 screens at 1440x900), shorter than the screen: its tile (the screen from its top) shows 559px of it and 341px of the next section, its heading "Yer açmak isteyeceğin tasarıml" on screen
- **section-tile** — main#main > section.shop-section.container:nth-of-type(8) "Sehpana karar vermeden.": the section is 425px tall (0.47 screens at 1440x900), shorter than the screen: its tile, held at the page's end (scroll 3394px) shows 425px of it and 132px of the section above, its heading "Beğendiğin tasarım, daha iyi f" on screen
- **hero-screen** — main#main > section.hero.container "Küçük dokunuşlar, güzel evlerEvinize yak": the hero ends at 750px on a 900px screen, 150px above the fold: it ends at the fold, 1px either way (SR-1)
- **hero-screen** — main#main > div.benefits.container "Hayatınıza uyum sağlarGünlük kullanım iç": 150px of the next section shows on the first screen (from 750px on a 900px screen): nothing below the hero shows at load (SR-1)
- **section-height** — main#main > div.benefits.container "Hayatınıza uyum sağlarGünlük kullanım iç": the section is 96px tall (0.1 screens), 804px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height** — section#ilham "Dokusu güzel. Kullanımı rahat.Detaylarda": the section starts at 2286px, 414px above the screen grid (3 x 900px): sections start on whole screens (SR-2)
- **section-height** — section#tasarimlar "Biraz ilham, biraz senYer açmak isteyece": the section starts at 1405px, 395px above the screen grid (2 x 900px): sections start on whole screens (and 7 more like it: "sehpacıyız.Güzel bir ev,", "Fırsat köşesiBeğendiğin ", "Küçük dokunuşlar, güzel ") (SR-2)
- **section-height** — div.storefront > footer.site-footer "sehpacıyız.Güzel bir ev, herkesin hakkı.": the section's content does not fit it: its lowest content ends 321px below its top, past 271px (the section less 72px of bottom padding) (SR-2)
- **section-air** — main#main > div.benefits.container "Hayatınıza uyum sağlarGünlük kullanım iç": the content fills 39.3% of the section's height (38 of 96px): 55% or more (40% WARN) (SR-3)
- **one-section** — section#tasarimlar > div.section-heading > div > h2 "Yer açmak isteyeceğin tasarımlar.": the screen at scroll 900px (stride 1) shows 395px of section 4 and the heading of section 4 whole and the content of 2 sections, over 24px each beside section 3: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-section** — main#main > section.container.sale-banner > div:nth-of-type(2) > h2 "Beğendiğin tasarım, daha iyi fiyat.": the screen at scroll 3380px (the top of section 8) shows 329px of section 10 and the heading of section 8 whole and the content of 3 sections, over 24px each beside section 9: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-heading** — section#tasarimlar > div.section-heading > div > h2 "Yer açmak isteyeceğin tasarımlar.": headings of two sections show whole on one screen at 33 of 68 scroll positions (48.5%; at scroll 600, 650, 700, 750px), here with "Senin evin, senin tarzın.": at most 3% on a desktop (SR-5)
- **container-edges** — main#main > section.container.sale-banner "Fırsat köşesiBeğendiğin tasarım, daha iy": the content of section 8 runs 120px from the left and 120px from the right (read from its outermost blocks: no .wrap): the page's container starts at 80px (one container, equal margins, 2px either way) (SR-6)
- **container-edges** — div.storefront "İçeriğe geç Evinizin yeni favorisiyle ta": a <div> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges** — main#main > section.hero.container "Küçük dokunuşlar, güzel evlerEvinize yak": the section needs exactly one in-flow child .wrap (it has 2 in-flow children, 0 .wrap) (and 9 more like it: "Hayatınıza uyum sağlarGü", "Her köşeye bir tasarımSe", "Biraz ilham, biraz senYe") (SR-6)
- **container-edges** — div.storefront > header.site-header > div.navigation-border "Tüm koleksiyonOrta sehpalarYan sehpalarZ": a box runs 0-1440px, outside the container lines of the nav at 80-1360px: full width is for background layers and grounds only (SR-6)
- **container-edges** — main#main > section.hero.container > div.hero-image > span.hero-image-index "01 / Sehpacıyız seçkisi": 1 text block starts on a left line at x 1245, 1165px from the container's left: text starts on the container's left, or on one split line (x 623, 732, 841) (SR-6)
- **container-edges** — main#main > section.container.sale-banner > div:nth-of-type(2) > p "Seçili ürünlerde %14’e varan fiyat avant": 1 text block starts on a left line at x 156, 76px from the container's left: text starts on the container's left, or on one split line (x 623, 732, 841) (and 4 more like it: "Beğendiğin tasarım, daha", "Evinize yakışır.Bütçeniz", x 113) (SR-6)
- **container-edges** — section#ilham > div.editorial-photo > img "Luna sehpanın doğal ahşap dokusu ve yuva": a <img> over half the container wide runs 80-745px, not on the container's lines at 80-1360px (SR-6)
- **container-edges** — main#main > section.hero.container > div.hero-image > img "Doğal meşe oval sehpanın yer aldığı sıca": a <img> over half the container wide runs 649-1360px, not on the container's lines at 80-1360px (and 4 more like it: "Hazır stok ve üretim ara", "Kargo ücreti nasıl hesap", "Sehpanın ölçülerini nere") (SR-6)
- **row-lines** — main#main > section.budget-band > div.container.budget-inner > div.budget-links "3.000 TL altı tasarımlar3.000 – 5.000 TL": a row of 3 items: its first item starts at 610px, the container's left line at 80px (2px either way) (SR-7)
- **no-visual** — main#main > section.budget-band "Tarzına da, bütçene de.": no picture, effect or mock in this section; a feature section needs a visual
- **no-visual** — main#main > section.shop-section.container:nth-of-type(6) "Sen söyle, biz daraltalım.": no picture, effect or mock in this section; a feature section needs a visual
- **off-grid** — div.container.footer-grid > div.footer-brand > a.logo > span ".": left edge at 185px, 20px off a common edge of its section at 205px (4 elements)
- **edge-right** — #kategoriler a.category-card.category-0 "Orta sehpalarSalonun buluşma nok": ends at x 385; the right line is 1360
- **edge-right** — #kategoriler a.category-card.category-1 "Yan sehpalarHer köşeye bir dokun": ends at x 710; the right line is 1360
- **edge-left** — #kategoriler a.category-card.category-2 "Zigon sehpalarBirlikte de ayrı d": starts at x 730; the lines are 80 and the column starts
- **edge-left** — #kategoriler a.category-card.category-3 "DresuarlarHoş bir karşılama": starts at x 1055; the lines are 80 and the column starts
- **edge-left** — section.budget-band div.budget-links "3.000 TL altı tasarımlar3.000 – ": starts at x 610.1; the lines are 80 and the column starts
- **edge-left** — section.container.sale-banner h2 "Beğendiğin tasarım, daha iyi fiy": starts at x 196; the lines are 80 and the column starts
- **edge-left** — section.container.sale-banner p "Seçili ürünlerde %14’e varan fiy": starts at x 196; the lines are 80 and the column starts
- **edge-left** — footer.site-footer div "Koleksiyonu keşfetOrta sehpalarY": starts at x 506.7; the lines are 80 and the column starts
- **edge-left** — footer.site-footer div "Yardımcı olalımTeslimat ve monta": starts at x 807.1; the lines are 80 and the column starts
- **edge-left** — footer.site-footer div "SehpacıyızHakkımızdaGizlilik ve ": starts at x 1107.5; the lines are 80 and the column starts
- **edge-left** — footer.site-footer span "Yerel tasarım önizlemesi. Ürünle": starts at x 1107.6; the lines are 80 and the column starts
- **screen-short** — section.hero.container section.hero.container "Küçük dokunuşlar, güzel evlerEvi": 548px tall; one screen under the nav is 900px
- **screen-short** — #kategoriler section.shop-section.container "Her köşeye bir tasarımSenin evin": 559px tall; one screen under the nav is 900px
- **neighbour** — #kategoriler section.shop-section.container "Her köşeye bir tasarımSenin evin": framed, 122px of #tasarimlar section.shop-section.products-section "Biraz ilham, biraz senYer açmak " shows
- **neighbour** — #ilham section.shop-section.container "Dokusu güzel. Kullanımı rahat.De": framed, 50px of section.budget-band section.budget-band "Güzel tasarıma yer varTarzına da" shows
- **screen-short** — section.budget-band section.budget-band "Güzel tasarıma yer varTarzına da": 222px tall; one screen under the nav is 900px
- **screen-height** — section.budget-band section.budget-band "Güzel tasarıma yer varTarzına da": 222px, 0.25 screens; a section is exactly one or two (--h)
- **neighbour** — section.budget-band section.budget-band "Güzel tasarıma yer varTarzına da": framed, 51px of section.shop-section.container section.shop-section.container "Seçmek şimdi daha kolaySen söyle" shows
- **screen-short** — section.shop-section.container section.shop-section.container "Seçmek şimdi daha kolaySen söyle": 280px tall; one screen under the nav is 900px
- **screen-height** — section.shop-section.container section.shop-section.container "Seçmek şimdi daha kolaySen söyle": 280px, 0.31 screens; a section is exactly one or two (--h)
- **neighbour** — section.shop-section.container section.shop-section.container "Seçmek şimdi daha kolaySen söyle": framed, 50px of section.container.sale-banner section.container.sale-banner "Fırsat köşesiBeğendiğin tasarım," shows
- **screen-short** — section.container.sale-banner section.container.sale-banner "Fırsat köşesiBeğendiğin tasarım,": 146px tall; one screen under the nav is 900px
- **screen-height** — section.container.sale-banner section.container.sale-banner "Fırsat köşesiBeğendiğin tasarım,": 146px, 0.16 screens; a section is exactly one or two (--h)
- **neighbour** — section.container.sale-banner section.container.sale-banner "Fırsat köşesiBeğendiğin tasarım,": framed, 68px of section.shop-section.container section.shop-section.container "Aklındaki sorularSehpana karar v" shows
- **screen-short** — section.shop-section.container section.shop-section.container "Aklındaki sorularSehpana karar v": 425px tall; one screen under the nav is 900px
- **screen-height** — section.shop-section.container section.shop-section.container "Aklındaki sorularSehpana karar v": 425px, 0.47 screens; a section is exactly one or two (--h)
- **hero-fold** — section.hero.container section.hero.container "Küçük dokunuşlar, güzel evlerEvi": starts at y 202, not under the nav
- **edge-left** — #kategoriler a.category-card.category-1 "Yan sehpalarHer köşeye bir dokun": starts at x 201; the lines are 16 and the column starts
- **edge-right** — #kategoriler a.category-card.category-2 "Zigon sehpalarBirlikte de ayrı d": ends at x 189; the right line is 374

## Gerekçeli istisnalar

- **overlap-text** — The discount badge deliberately overlays the product photograph, as in the shopping reference. It sits above the image with readable contrast and covers no product information text. The alternate photograph is decorative.
- **card-layout** — Identical product card layouts are intentional for comparing prices, colours and lead times. Varying each card's structure would undermine the user's explicit request for easy, detailed shopping.
- **photo-repeat** — Category navigation and product listings intentionally reuse the same catalogue products. Also, Next image URLs share the basename image, which the checker groups despite their different source query strings.

## Son ekran ve performans kontrolü

Son sürümün 1440×900, 1024×768, 820×1180, 768×1024 ve 390×844 tarayıcı kontrollerinde yatay taşma ve JavaScript istisnası görülmedi. Görsel kayıtlar `output/qa/redesign/layout/` altında. Tam ekran tanıtım sayfası düzeniyle ilgili 24–38 bulgu ekran boyutuna göre devam ediyor; bu kontrol tümüyle geçti olarak işaretlenmedi.

Performans aracı yerel geliştirme sunucusunda birer ölçümle çalıştırıldı; bu bir canlı site performans testi değildir. İki ekran boyutunda da bozuk istek yok, yerleşim kayması 0.000, görsel ve font aktarımı araç bütçesi içinde. Araç toplam 4 FAIL verdi: iki boyutta geliştirme JavaScript paketinin yaklaşık 4.2 MiB açılmış boyutu, iki boyutta Next Image `fill` görsellerinde doğrudan HTML width/height özniteliği olmaması. Görsel alanları CSS aspect-ratio veya sabit çerçeve ile ayrılır; ölçümde kayma oluşmadı. Üretim sunucusu bu projede mevcut yerel veri adaptörüyle desteklenmediği için canlı JavaScript/LCP sonucu iddia edilmez.

Dosyalar: `output/qa/redesign/design-gate.json`, `consistency-report.json`, `layout-report.json`, `performance-report.json`, `functional-checks.txt`. JSON raporları filtrelenmeden korunmuştur.
