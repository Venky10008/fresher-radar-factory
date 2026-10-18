# RadarReelV2 — Design System

9:16 reels (1080×1920) for "Fresher Radar", Telugu mixed-English. This directory is a second, independent Remotion template — `src/` is untouched except `src/types.ts`.

## Structure

```
src-v2/
  design/
    tokens.ts        Grid, safe areas, type scale, easing, text measurement
    palettes.ts      Six category palettes (with contrast ratios below)
    seed.ts          Deterministic RNG + computeVariants()
    fonts.ts         Noto Sans Telugu + Noto Sans (delayRender, Google Fonts + local fallback)
  components/
    Background.tsx   4 seed-picked patterns, cosine drift, vignette, grain
    BrandHeader.tsx  Top kicker + category badge (inside top safe area)
    Progress.tsx     Segmented per-scene bar above bottom safe edge
    Caption.tsx      Word-boundary timeline from edge-tts; accent tint on spoken word
    ui.tsx           Enter, SceneShell, Kicker, Chip
    Picture.tsx      Ken Burns, palette tint, masks, EmptyVisual stand-in
  scenes/
    HookScene.tsx    3 seed variants
    LineScene.tsx    4 variants (Hero, FullBleed, Editorial, Stacked)
    StudentsScene.tsx
    CtaScene.tsx     Link in bio + Comment JOIN + WhatsApp/Telegram groups
  Root.tsx           Compositions: RadarReelV2 (9:16 reel), ContactSheet
  ContactSheet.tsx   6 cats × short/medium/long × photo/graphic + hooks + end cards
  index.ts           registerRoot(RemotionRootV2)
  RadarReelV2.tsx    Main reel component
```

## Palettes & Contrast Ratios

Six category design systems. Contrast ratios computed per WCAG (AA normal text ≥ 4.5:1, AA large text ≥ 3:1, AAA normal ≥ 7:1).

| Category | Mood | text on bg | textMuted on bg | onAccent on accent | onAccent on primary | text on surface | textMuted on surface2 |
|----------|------|-----------|----------------|-------------------|--------------------|-----------------|----------------------|
| **ai_tools** | Deep violet night with electric cyan — futuristic, product-demo energy | 17.63 | 9.78 | 10.45 | 4.46 | 15.99 | 7.77 |
| **govt_jobs** | Official navy with saffron — dependable, notification-board serious | 16.51 | 10.00 | 8.10 | 3.62 | 13.49 | 6.51 |
| **private_jobs** | Clean blue and white corporate — crisp, daylight, hiring-desk feel | 15.50 | 6.93 | 8.24 | 6.39 | 17.25 | 6.56 |
| **internships** | Emerald and lime — growth, first-chance optimism | 15.84 | 10.82 | 11.02 | 5.84 | 13.17 | 6.99 |
| **certificates** | Burgundy and gold — diploma gravitas, premium course feel | 17.32 | 9.98 | 11.19 | 3.12 | 15.84 | 7.73 |
| **career_boost** | Coral on warm charcoal — friendly coaching, momentum | 17.76 | 11.84 | 10.67 | 6.32 | 16.36 | 9.51 |

### Notes on contrast

- **All main-text ratios (text on bg, text on surface) exceed 13:1** — well above AAA.
- **textMuted on bg** ranges from 6.51–11.84 — all pass AA normal text (≥4.5:1).
- **onAccent on accent** ranges from 8.10–11.19 — all pass AAA normal text (≥7:1).
- **onAccent on primary**: govt_jobs (3.62) and certificates (3.12) are below 4.5:1 but above 3:1 — acceptable for large text (chips, rails) at AA. Primary is used for structural elements (rails, tracks, chips) where text is typically large.

### Palette fields

| Field | Purpose |
|-------|---------|
| `bg` / `bgAlt` | Base background + gradient partner |
| `surface` | Cards and panels |
| `surface2` | Raised rows inside cards |
| `primary` | Structural colour (rails, tracks, chips) |
| `accent` | Highlight colour (current word, fills, progress) |
| `text` | Main text |
| `textMuted` | Secondary text (labels, counters) |
| `onAccent` | Text colour placed on accent/primary fills |
| `light` | True when background is light (text colours flip) |

## Safe Areas

- Width: 1080px, Height: 1920px (9:16)
- Top safe area: 192px (keep kicker/badge above this)
- Bottom safe area: 1536px (keep captions/CTA above this)
- Progress bar sits above the bottom safe edge

## Voice Pipeline (Part B)

`scripts/make_assets.py` builds `public/props.json` per job:
- edge-tts `WordBoundary` events → `scene.words` (frame-accurate caption timing)
- Optional `voice_*_te` fields → pure Telugu script for voice; screen shows normal text
- `atempo` speed-pull toward run-average CPS; `loudnorm` per clip
- `audioSeconds` per scene; optional `sfx` whoosh
- Backwards compatible: optional fields only appear when produced

## Rendering

```bash
# v1 (original template)
npx remotion render src/index.ts RadarReel out/reel.mp4 --props=public/props.json

# v2 (this template)
npx remotion render src-v2/index.ts RadarReelV2 out/reel.mp4 --props=public/props.json

# Contact Sheet (frozen contact sheet of all variants)
npx remotion still src-v2/index.ts ContactSheet out/contact-sheet.png --props='{}'
```

## GitHub Actions

`.github/workflows/render-reel.yml` — `workflow_dispatch` with inputs:
- `post_id` — release tag `reel-<post_id>`
- `template` — `v1` or `v2`
- `job` — job JSON string

Publishes `out/reel.mp4` + `out/build-log.txt` as a GitHub Release. Prunes releases older than 30 days.