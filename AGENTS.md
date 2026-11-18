<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product image rule (user instruction)

- Always process product photos as transparent-background cutouts before embedding or importing them into the storefront. The user has repeated this requirement; do not ask them to repeat or reconfirm it.
- Use the existing non-generative cutout workflow in `scripts/catalog/prepare-cutouts.mjs` and the recorded outputs in `src/data/catalog-cutouts.json`. Preserve source photos, product RGB pixels, proportions, materials, and fine details. Do not regenerate or redesign the photographed product.
- Product cards, hero, galleries, category tiles, navigation thumbnails, related products and shopping panels must use verified cutout assets. Keep source photos in `originalImages` for provenance, not for storefront display.
- Render with ordinary alpha compositing (`mix-blend-mode: normal`). Never use multiply, filters or white-removal CSS as a substitute for a cutout, and never tint the product to match a colored surface.
- Before applying catalogue changes, run the cutout validation. Missing, opaque or mismatched assets must stop the import; prepare and review the cutout first.
- For visual QA, inspect at least a light product, a reflective/metal product and thin legs or open-frame details on the actual page backgrounds.

## Online preview handoff (user instruction)

- At the end of website work, update the hosted design preview and share its stable HTTPS link. The user switches internet providers during the day; localhost or a LAN address is not an acceptable final preview link.
- Hosting target: `preview/hosting-target.json`. Reuse this Site identity and URL; do not create a new Site for routine updates. Preserve the current private audience unless the user asks to change sharing.
- Prepare a separate, sanitized Sites source checkout with `node scripts/prepare-online-preview.mjs --destination <checkout>`, then use the Sites skill workflow to build and publish that same Site.
- The online preview includes versioned storefront/catalogue data only. Never copy `.env.local`, `.local`, company records, accounts, secret settings or database files into it. The full local application remains in this repository.
