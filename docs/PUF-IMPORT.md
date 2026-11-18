# Puf kataloğu aktarımı — 18 Kasım 2026

Kullanıcının verdiği Kataloqp kaynağındaki PUF01 (20 sayfa) ve PUF02 (14 sayfa) kataloglarının görselli 64 modelinin tamamı aktarıldı. İlk katalogda 38, ikincisinde 26 model vardır. Özgün model adları, Türkçe karakterler ve `PYP-...` ürün kodları korunur; URL'lerde kod da bulunduğu için aynı adlı modeller karışmaz. Önceki 133 ürün korunmuştur; toplam 197 ürün, 8 kategori ve 258 dekupe galeri görseli vardır.

## Fiyat kuralı

Kullanıcı KDV hariç birim yerine menünün KDV dahil **TOPLAM** sütununu seçti. Ardından fiyatların 50 veya 100 TL'nin katları olmasını istedi. Uygulanan kural:

```text
Satış fiyatı = ceil((kaynak KDV dahil toplam × 2,5) / 50) × 50 TL
```

KDV tekrar eklenmez. Örnekler: Linda PYP-0830 4.400 → 11.000 TL; Rosa PYP-0832 4.125 → 10.350 TL; Lupa PYP-0837 3.135 → 7.850 TL. Son fiyatlar tam sayı kuruş olarak saklanır ve 00/50 TL ile biter. Gerçekte olmayan önceki fiyat/indirim oluşturulmaz.

Fiyat menüsünde 73 puf satırı bulunur. Görsel kataloglarda yer almayan 9 ilave ölçü/mekanizma seçeneği `pouf-provenance.json` içinde ayrı kayıtlıdır; farklı bir modelin fotoğrafıyla ürün uydurulmamıştır. Katalogdaki 64 görselli kodun tamamı fiyat satırıyla eşleştirilmiştir.

## Kaynak ve ürün bilgisi

Kaynak: https://www.kataloqp.online — PUF01.pdf, PUF02.pdf ve menüdeki POY fiyat listesi. Ham PDF'ler, giriş şifresi ve çalışma dosyaları yayımlanmaz veya Git'e eklenmez. Doğrulanabilir ürün/fotoğraf/fiyat kayıtları `src/data/pouf-provenance.json` içindedir. Tedarikçi fiyatları müşteri arayüzüne gönderilen ürün verisine konulmaz.

Kaynak 32 DNS sünger ve 15 iş günü süre belirtir. Puflar siparişe özel ve 15 iş günü hazırlık süresiyle tanımlanır; kaynağın doğrulamadığı hazır stok miktarı uydurulmaz. Malzeme ve montaj bilgisi verilmemiş alanlarda teyit metni kullanılır. Kaynağın imalattan teslim veya müşteri kumaşı indirimi gibi toptan koşulları perakende teslimat vaadine çevrilmez.

Sekiz modelde görsel katalog ve fiyat tablosu ölçüleri çelişir. Görsel katalogdaki ölçü korunur ve ürün ekranında teyit gerekliliği belirtilir. Her iki kaynak değeri provenance kaydında durur.

## Görseller ve kontroller

Fotoğraflar PDF'nin kendi görüntü nesnelerinden, kodun bulunduğu doğru yarım sayfa ile eşleştirilerek çıkarılır. 64 kaynak JPEG'in tamamının farklı olduğu doğrulanmıştır. Kaynak fotoğrafın ürün pikselleri, rengi ve oranları değiştirilmez.

Mevcut ISNet/ONNX dekupe iş akışı `prepare-cutouts.mjs --root <hazırlık>` ile ayrı çalışma klasöründe kullanılır. `pouf-mask-refinements.json` yalnızca ürünün tamamını içeren model giriş bölgelerini ve gözle doğrulanmış arka plan boşluklarını tanımlar. `isolate-pouf-subjects.mjs` ürünün her pozitif alfa değerini korur; opaklık eşiğiyle kumaş veya ayak inceltmez. `finalize-pouf-cutouts.mjs` yalnızca tamamen şeffaf dış sınırları kırpar, RGB'yi yeniden örneklemez. `sourceCrop` özgün JPEG koordinatlarını saklar; piksel testi kırpılan bölgedeki RGB'nin kaynakla bire bir aynı olduğunu doğrular. Açık X çerçeveleri, ince ayaklar, metal halkalar, açık sandık kapağı ve içindeki kumaş görsel kontrolden geçirilmiştir.

`import-pouf-catalog.mjs --source-root <araştırma> --prepared-root <hazır dekupe>` önce kuru kontrol yapar. `--apply` öncesinde 64 yeni görseli doğrular; uygularken birleşik 197 ürün/258 görseli aday kayıtla doğrular, yedek alır ve mevcut mağaza ayarları ile şirket kayıtlarını korur. Her tedarikçinin dekupe kaydı korunur; eski katalog için dekupe üretmek puf kayıtlarını silmez.

Başlıca kontroller: `npm run typecheck`, `npm test`, `npm run images:validate` ve çevrimiçi önizlemenin boyut kontrollü statik derlemesi. Yayın sonunda aynı HTTPS önizleme adresi kullanılır.
