# Media reconciliation

- Frames downloaded from Instagram: 1949 (all 150 posts), 0 failures, 0 zero-byte, 0 corrupt (every file decoded by libvips).
- Frames used in property galleries: 1759 across 104 properties; reel films cached for 14 reel-only properties.
- Source ceiling: Instagram serves originals at **1080 px wide** (most 1080×720/810). Fullscreen derivatives above 1080 px would be upscales, so the site caps display at native size: split hero, max-1080 lightbox.

## Checks

| Check | Method | Result |
|---|---|---|
| File existence / zero-byte | stat of every derivative (validate.mjs) | pass |
| Corrupt images | sharp metadata + stats on every frame | 0 errors |
| Duplicate hashes within a gallery | SHA-256 of 1080 derivative (validate.mjs) | 0 |
| Cross-property reuse | 64-bit dHash, Hamming ≤ 4 across all property frames | 0 pairs (one near-match was within the same merged Sandown listing) |
| Low-resolution frames | width < 700 | 12 reel covers (portrait 640 px) + 8 frames in one Eye of Africa carousel; kept, never used as a homepage hero |
| Logos / promotional graphics in galleries | Visual audit of every gallery (contact sheets) | None in LHOSA carousels; burned-in text only on the reel cover of oakdene-three-bedroom-home (flagged posterOnly) |
| Agent portraits as property images | Visual audit | Agent in frame on reel covers of bryanston-two-bedroom-apartment and seaton-estate-residence (flagged posterOnly; excluded from homepage selections) |
| Wrong hero | Visual audit | fresnaye-view-residence re-led with frame 05 (infinity pool, Lion's Head, sea) instead of the street facade |

## Derivatives

| Output | Widths | Format | Notes |
|---|---|---|---|
| Every gallery frame | 720, 1080 (native cap) | WebP q74/q76 | srcset + sizes, explicit width/height, lazy + async decode |
| Hero frame (01) | 480, 720, 1080 | WebP + JPEG q80 (mozjpeg) | JPEG is the `<img>` fallback and og:image |
| Reel films | as published | MP4 | `preload=none`, poster frame, play on demand only |

AVIF was measured (about 20% smaller than WebP) but was about 30× slower to encode across 1,759 frames. WebP was chosen and the finding recorded. Total image weight is about 210 MB; film is about 90 MB.

## Per-property media flags

- **bryanston-two-bedroom-apartment**: Reel cover shows the agent in frame (posterOnly)
- **seaton-estate-residence**: Reel cover shows the agent in frame (posterOnly)
- **oakdene-three-bedroom-home**: Reel cover carries burned-in price/spec text (posterOnly)
- **green-point-ocean-view-apartment**: Reel cover is a TV-wall interior; weak representation (posterOnly)
- **fresnaye-view-residence**: Infinity-pool frame with Lion's Head and sea leads; carousel cover (street facade) follows
