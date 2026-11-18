# Görsel kaynakları

Bu katalog bir tasarım önizlemesidir. Ürün adları, fiyatlar, stoklar ve teknik özellikler örnektir. Gerçek katalog aktarımında doğrulanmış ürün bilgileri ve fotoğrafları kullanılacak.

- `public/images/living-room.webp`: Yerleşik image_gen aracıyla üretilen örnek yaşam alanı.
- `public/images/luna-studio.webp`: Aynı örnek sehpanın stüdyo görünümü; yerleşik image_gen.
- `public/images/luna-detail.webp`: Stüdyo görünümünün detay kırpımı.
- `public/images/gemora.webp`, `paloma.webp`, `siena.webp`: Kullanıcının mevcut Yergin projesindeki `public/images/` örnek fotoğraflarından optimize edildi. Bunlar gerçek Sehpacıyız ürün eşleştirmesi değildir.
- Manrope: Google Fonts üzerinden yerelde barındırılan font dosyaları; lisans `public/fonts/OFL.txt`.

## Yaşam alanı üretim komutu

Use case: photorealistic-natural. Asset type: wide hero photography for Sehpaciyiz, an approachable Turkish furniture ecommerce brand for middle income households. Primary request: beautiful realistic lived-in modest contemporary Istanbul apartment living room with an affordable stylish light oak oval coffee table as the clear hero subject, rounded solid-looking legs and open lower shelf, ivory fabric sofa behind, soft pale sage wall, one rust cushion, sheer curtains, daylight from left, cream woven rug, one small green plant. Unpretentious attainable furniture, polished catalog photography, tactile wood grain and natural shadows. Composition: landscape 3:2 image, camera around table height at 3/4 perspective, entire coffee table visible in lower middle, sofa cropped at top, no people, no expensive marble, no luxury mansion. No text, no logo, no graphics, no watermark. Image used only as an explicitly labeled concept demo, not real inventory.

## Stüdyo üretim komutu

Use case: product-mockup. Asset type: ecommerce product catalog image. Reference image: the supplied living-room photo. Photograph the exact same light oak oval coffee table with round cylindrical legs and an oval lower shelf from the reference, maintaining its actual geometry and wood tone. Isolate this one table in an empty seamless very light warm grey photography studio. No sofa, no rug, no props, no plant, no objects on either shelf. Three-quarter view, camera at table height, full product including all legs visible with generous space around it, soft realistic contact shadow. Natural oak grain, approachable affordable furniture, highly realistic furniture catalog photo. Landscape 3:2 composition. No text, logo, watermark or borders.

Her iki üretim de yerleşik image_gen ile yapıldı; ücretli harici API veya Nim kullanılmadı. Kaynak PNG dosyaları Codex generated_images dizininde korunur; site kendi public/images kopyalarını kullanır.
