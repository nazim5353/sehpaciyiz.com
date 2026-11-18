# Ürün kodları ve şeffaf görseller

## Zorunlu dekupe kuralı

Ürün fotoğrafları vitrine eklenmeden önce şeffaf arka planlı dekupe olarak hazırlanır. Kaynak fotoğraf korunur; ürün rengi, malzemesi, formu ve ince detayları değiştirilmez. Renkli site yüzeyleri, görsele `multiply` veya filtre uygulamadan normal alfa bileşimiyle kullanılır. Bu kural `AGENTS.md` içinde de kayıtlıdır.

`node scripts/catalog/validate-cutouts.mjs` (veya `pnpm images:validate`) 133 ürünün 194 dekupe görselini, 7 kategoriyi ve yerel vitrinin dosya eşleşmelerini denetler. `apply-catalog.mjs` ve görselleri değiştiren `apply-product-presentation.mjs`, bu kontrol geçmeden aktarımı tamamlamaz. Eksik, kaydı uyuşmayan veya şeffaf olmayan görseller önce hazırlanıp incelenmelidir.

Kaynak ürünler, özgün ürün kimliği ve URL üzerinden mevcut ürünlerle eşleştirildi. Her kaynak sayfasında görünen `SKU` değerinin `product.sku` alanından geldiği ve yapılandırılmış ürün verisiyle eşleştiği doğrulandı. Harfler ve rakamlar korunur, yalnızca çevresindeki boşluklar temizlenir. Mağazada `QN-` öneki kullanılır.

Örnek: kaynak Valen Zigon Sehpa, SKU `Z339` → Tolvia Zigon Sehpa Seti, ürün kodu `QN-Z339`. Kaynak veritabanı kimliği `235`, ürün kodu yerine kullanılmaz.

## Eşleştirme tablosu

| Kaynak ürün | Mağaza ürünü | Kaynak kod | Yeni kod |
| --- | --- | --- | --- |
| Correa Orta Sehpa | Solvia Orta Sehpa | C103 | QN-C103 |
| Camello Orta  Sehpa | Orelio Orta Sehpa | C106 | QN-C106 |
| Roma Orta Sehpa | Malvero Orta Sehpa | C110 | QN-C110 |
| Puig Orta Sehpa | Kavelo Orta Sehpa | C125 | QN-C125 |
| Liberigo Orta Sehpa | Corven Orta Sehpa | C136 | QN-C136 |
| Nuta Orta Sehpa | Evario Orta Sehpa | C137 | QN-C137 |
| Astrid Orta Sehpa | Nerova Orta Sehpa | C139 | QN-C139 |
| Mionta Orta Sehpa | Soriva Orta Sehpa | C152 | QN-C152 |
| Carrera Orta Sehpa | Melora Orta Sehpa | C153 | QN-C153 |
| Stark Orta Sehpa | Arven Orta Sehpa | C157 | QN-C157 |
| Cosmos Orta Sehpa | Ravena Orta Sehpa | C169 | QN-C169 |
| Orenda Orta Sehpa | Perivo Orta Sehpa | YC108 | QN-YC108 |
| Paloma Orta Sehpa | Manvero Orta Sehpa | YC113 | QN-YC113 |
| Loren Orta Sehpa | Olenia Orta Sehpa | C264 | QN-C264 |
| Milton Orta Sehpa | Ervian Orta Sehpa | C168 | QN-C168 |
| Lujo Orta Sehpa | Marevo Orta Sehpa | C041 | QN-C041 |
| Mythos Orta Sehpa | Renova Orta Sehpa | C174 | QN-C174 |
| Giverny Orta Sehpa | Solvian Orta Sehpa | C170 | QN-C170 |
| Novi Orta Sehpa | Delvia Orta Sehpa | C258 | QN-C258 |
| Vega Orta Sehpa | Solvero Orta Sehpa | C158 | QN-C158 |
| Natura Orta Sehpa | Belvio Orta Sehpa | C024 | QN-C024 |
| Ottawa Orta Sehpa | Soreno Orta Sehpa | C023 | QN-C023 |
| Laura Orta Sehpa | Relven Orta Sehpa | C261 | QN-C261 |
| Astrid Yan Sehpa | Nerova Yan Sehpa | Y435 | QN-Y435 |
| Leris Yan Sehpa | Evaris Yan Sehpa | Y407 | QN-Y407 |
| Rocha Yan Sehpa | Selvian Yan Sehpa | Y427 | QN-Y427 |
| Romero Yan Sehpa | Tirena Yan Sehpa | Y415 | QN-Y415 |
| Rossi Yan Sehpa | Verdan Yan Sehpa | Y408 | QN-Y408 |
| Sorbelli Yan Sehpa | Nerelio Yan Sehpa | Y417 | QN-Y417 |
| Benito Zigon Sehpa | Ivara Zigon Sehpa Seti | Z304 | QN-Z304 |
| Liza Zigon Sehpa | Calira Zigon Sehpa Seti | Z319 | QN-Z319 |
| Lucimi Zigon Sehpa | Kireva Zigon Sehpa Seti | Z308 | QN-Z308 |
| Mendy Zigon Sehpa | Evania Zigon Sehpa Seti | Z305 | QN-Z305 |
| Plano Zigon Sehpa | Valeris Zigon Sehpa Seti | Z303 | QN-Z303 |
| Rigoni Zigon Sehpa | Orelia Zigon Sehpa Seti | Z310 | QN-Z310 |
| Samba Zigon Sehpa | Calvio Zigon Sehpa Seti | Z354 | QN-Z354 |
| Soria Zigon Sehpa | Ovaris Zigon Sehpa Seti | Z318 | QN-Z318 |
| Jose Zigon Sehpa | Belvia Zigon Sehpa Seti | Z359 | QN-Z359 |
| Nanga Orta Sehpa | Talvero Orta Sehpa | C161 | QN-C161 |
| Vienna Orta Sehpa | Morvia Orta Sehpa | C267 | QN-C267 |
| Mila Orta Sehpa | Darvio Orta Sehpa | C266 | QN-C266 |
| Vera Orta Sehpa | Narven Orta Sehpa | C117 | QN-C117 |
| Lorenzo Orta Sehpa | Varelo Orta Sehpa | C130 | QN-C130 |
| Lublin Orta Sehpa | Berova Orta Sehpa | YC104 | QN-YC104 |
| Neto Dresuar | Novian Dresuar | D707 | QN-D707 |
| Leja Orta Sehpa | Anviro Orta Sehpa | C014 | QN-C014 |
| Sivera Zigon Sehpa | Tarven Zigon Sehpa Seti | Z326 | QN-Z326 |
| Roni Orta Sehpa | Averio Orta Sehpa | C241 | QN-C241 |
| Owen Orta Sehpa | Erelia Orta Sehpa | C018 | QN-C018 |
| Romero Orta Sehpa | Tirena Orta Sehpa | C151 | QN-C151 |
| Laluna Orta Sehpa | Ovelia Orta Sehpa | C012 | QN-C012 |
| Centre Orta Sehpa | Kavira Orta Sehpa | YC114 | QN-YC114 |
| Luna Yan Sehpa | Velian Yan Sehpa | Y014 | QN-Y014 |
| Nio Orta Sehpa | Karelo Orta Sehpa | C176 | QN-C176 |
| Aurora Orta Sehpa | Merian Orta Sehpa | C013 | QN-C013 |
| Siena Orta Sehpa | Ravira Orta Sehpa | C011 | QN-C011 |
| Colorido Orta Sehpa | Arevio Orta Sehpa | C015 | QN-C015 |
| Spica Orta Sehpa | Mirevo Orta Sehpa | C020 | QN-C020 |
| Nutra Orta Sehpa | Raveon Orta Sehpa | C022 | QN-C022 |
| Paloma Zigon Sehpa | Manvero Zigon Sehpa Seti | Z014 | QN-Z014 |
| Elyse Orta Sehpa | Narelo Orta Sehpa | YC111 | QN-YC111 |
| Zenith Orta Sehpa | Serivo Orta Sehpa | C016 | QN-C016 |
| Trees Orta Sehpa | Levian Orta Sehpa | C017 | QN-C017 |
| Sonata Orta Sehpa | Melvio Orta Sehpa | C019 | QN-C019 |
| Muse Dekoratif Raf | Lareva Dekoratif Kitaplık | K606 | QN-K606 |
| Neat Dekoratif Raf | Averis Dekoratif Kitaplık | K603 | QN-K603 |
| Valora Dekoratif Raf | Elvian Dekoratif Kitaplık | K602 | QN-K602 |
| Axis Dresuar | Corvia Dresuar | D720 | QN-D720 |
| Orbis Dresuar | Arvelo Dresuar | D013 | QN-D013 |
| Heavenly Dresuar | Talvia Dresuar | D703 | QN-D703 |
| Lunaris Dresuar | Alvero Dresuar | D012 | QN-D012 |
| Arona Dresuar | Alvian Dresuar | D704 | QN-D704 |
| Etera Dresuar | Vireon Dresuar | D709 | QN-D709 |
| Varenne Dresuar | Marvia Dresuar | D711 | QN-D711 |
| Nostra Dresuar | Omelia Dresuar | D722 | QN-D722 |
| Elano Dresuar  | Arveta Dresuar | YD724 | QN-YD724 |
| Serafina Zigon sehpa | Nireva Zigon Sehpa Seti | Z015 | QN-Z015 |
| Liora Zigon Sehpa | Silven Zigon Sehpa Seti | Z016 | QN-Z016 |
| Gaudi Orta Sehpa | Alveta Orta Sehpa | C026 | QN-C026 |
| Liventa Orta Sehpa | Neriva Orta Sehpa | C028 | QN-C028 |
| Linea Orta Sehpa | Meriva Orta Sehpa | C031 | QN-C031 |
| Atlante Orta Sehpa | Soreva Orta Sehpa | C032 | QN-C032 |
| Vetra Orta Sehpa | Olvero Orta Sehpa | C033 | QN-C033 |
| Strio Orta Sehpa | Senvia Orta Sehpa | C035 | QN-C035 |
| Viona Orta Sehpa | Vairel Orta Sehpa | C036 | QN-C036 |
| Elora Orta Sehpa | Evrina Orta Sehpa | C037 | QN-C037 |
| Terra Orta Sehpa | Larelio Orta Sehpa | C038 | QN-C038 |
| Nova Orta Sehpa | Laviro Orta Sehpa | C039 | QN-C039 |
| Orion Orta Sehpa | Talven Orta Sehpa | C040 | QN-C040 |
| Gredi Orta Sehpa | Mareno Orta Sehpa | YC116 | QN-YC116 |
| Pena Orta Sehpa | Arvian Orta Sehpa | C123 | QN-C123 |
| Eclipse Orta Sehpa | Milven Orta Sehpa | C177 | QN-C177 |
| Luan Orta Sehpa | Sorelio Orta Sehpa | C197 | QN-C197 |
| Nostra Orta Sehpa | Omelia Orta Sehpa | C262 | QN-C262 |
| Solena Yan Sehpa | Corena Yan Sehpa | Y010 | QN-Y010 |
| Silva Dresuar | Evelio Dresuar | D712 | QN-D712 |
| Aurelle Dresuar | Avelio Dresuar | D713 | QN-D713 |
| Portia Raf Ünitesi / Kitaplık | Nareva Dekoratif Kitaplık | K601 | QN-K601 |
| Novi Yan Sehpa | Delvia Yan Sehpa | Y012 | QN-Y012 |
| Centre Yan Sehpa | Kavira Yan Sehpa | Y013 | QN-Y013 |
| Vienna Yan Sehpa | Morvia Yan Sehpa | Y015 | QN-Y015 |
| Elera Yan Sehpa | Olvian Yan Sehpa | Y016 | QN-Y016 |
| Lujo Yan Sehpa | Marevo Yan Sehpa | Y017 | QN-Y017 |
| Colorido Yan Sehpa | Arevio Yan Sehpa | Y018 | QN-Y018 |
| Ottawa Yan Sehpa | Soreno Yan Sehpa | Y019 | QN-Y019 |
| Roni Yan Sehpa | Averio Yan Sehpa | Y432 | QN-Y432 |
| Vento Yan Sehpa | Ivenio Yan Sehpa | YS436 | QN-YS436 |
| Nexo Yan Sehoa | Sevria Yan Sehpa | S500 | QN-S500 |
| Luan Yan Sehpa | Sorelio Yan Sehpa | S502 | QN-S502 |
| Duo Yan Sehpa | Tereno Yan Sehpa | S504 | QN-S504 |
| Vela Yan Sehpa | Talino Yan Sehpa | S506 | QN-S506 |
| Vero Yan Sehpa | Kelvia Yan Sehpa | S507 | QN-S507 |
| Lino Yan Sehpa | Calven Yan Sehpa | YS439 | QN-YS439 |
| Lily İkili Set | Larevo İkili Yan Sehpa Seti | B108 | QN-B108 |
| Moena İkili Set | Carivo İkili Yan Sehpa Seti | B111 | QN-B111 |
| Nostra İkili Set | Omelia İkili Yan Sehpa Seti | B112 | QN-B112 |
| Savona Zigon Sehpa | Ravia Zigon Sehpa Seti | Z013 | QN-Z013 |
| Vario Zigon Sehpa | Revalio Zigon Sehpa Seti | Z017 | QN-Z017 |
| Modus Zigon Sehpa | Mevian Zigon Sehpa Seti | Z314 | QN-Z314 |
| Liva Zigon Sehpa | Alviro Zigon Sehpa Seti | Z316 | QN-Z316 |
| Gemora İkili Set | Nevio İkili Yan Sehpa Seti | B011 | QN-B011 |
| Selene Zigon Sehpa | Berivo Zigon Sehpa Seti | Z320 | QN-Z320 |
| Zenith Tv Sehpası | Serivo TV Sehpası | T016 | QN-T016 |
| Lunaris Tv Sehpası | Alvero TV Sehpası | T012 | QN-T012 |
| Vega Tv Sehpası | Solvero TV Sehpası | T158 | QN-T158 |
| Valen Zigon Sehpa | Tolvia Zigon Sehpa Seti | Z339 | QN-Z339 |
| Miara Yan Sehpa | Iveris Yan Sehpa | Y020 | QN-Y020 |
| Camello Zigon Sehpa | Orelio Zigon Sehpa Seti | Z106 | QN-Z106 |
| Velora Orta Sehpa | Cevira Orta Sehpa | C042 | QN-C042 |
| Mata Orta Sehpa | Torvia Orta Sehpa | C125A | QN-C125A |
| Gaia Dresuar | Selvia Dresuar | D014 | QN-D014 |
| Bellagio Servis Arabası | Tavira Servis Arabası | S001 | QN-S001 |
| Linz Orta Sehpa | Taveon Orta Sehpa | C268 | QN-C268 |

## Görseller

Kullanıcı fotoğrafları yeniden üretmeden otomatik dekupe yöntemini seçti. Şeffaf görseller ISNet maskelemesi ve ONNX Runtime ile bilgisayarda hazırlanır. Model yalnızca alfa maskesi üretir. Orijinal 194 dosya korunur. Türetilmiş PNG dosyaları `public/images/catalog-cutouts/<ürün>/<sıra>.png` konumundadır; galeri boyutları ve RGB pikselleri değiştirilmez. Model ve işlem araçları `.local` altında kalır, siteye çalışma bağımlılığı olarak eklenmez.

Kod kayıtları: `src/data/product-codes.json`. Görsel kayıtları: `src/data/catalog-cutouts.json`. Eski fotoğraf yolları ürünlerde `originalImages` alanında tutulur.

## Yeniden çalıştırma

1. `node scripts/catalog/sync-product-codes.mjs --refresh` kodları canlı kaynak sayfalarından doğrular.
2. `node scripts/catalog/prepare-cutouts.mjs --model isnet-general-use` tüm görselleri hazırlar; tamamlanmış işlere devam edebilir.
3. `node scripts/catalog/refine-cutouts.mjs` beyaz stüdyo zeminlerinde açık renk ayakları ve ince detayları koruyan alfa düzeltmesini uygular. `node scripts/catalog/clean-ground.mjs` kontrol sırasında işaretlenen zemin izlerini temizler. Ardından `node scripts/catalog/prepare-cutouts.mjs --model isnet-general-use` kayıt dosyasını günceller.
4. `node scripts/catalog/review-cutouts.mjs` görsel kontrol sayfalarını üretir.
5. `node scripts/catalog/apply-product-presentation.mjs` kuru kontrol yapar. Yerel sunucu durdurulduktan sonra `--apply` ile yalnızca kod ve fotoğraf alanları güncellenir. Özel mağaza ayarları ve fiyatlar korunur, yedek alınır.

Model: [ISNet / DIS](https://github.com/xuebinqin/DIS). İşlem altyapısı: [ONNX Runtime](https://github.com/microsoft/onnxruntime).
