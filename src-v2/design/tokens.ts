/**
 * RadarReelV2 design tokens.
 * One grid, one type scale, one spacing scale — used by every scene so the
 * reel reads like a single brand system, not a set of stickers.
 *
 * Frame: 1080x1920 @ 30fps (9:16).
 *
 * Safe areas (Instagram Reels + YouTube Shorts):
 *   top 10%    = 0..192px      -> no key content
 *   bottom 20% = 1536..1920px  -> no key content
 *   Everything important lives in STAGE (y: 300..1452), the brand header sits
 *   at HEADER_Y (just under the top safe edge) and the progress bar sits at
 *   PROGRESS_Y (just above the bottom safe edge).
 */
import { Easing } from "remotion";

export const FPS = 30;

/** frame size */
export const FRAME = { W: 1080, H: 1920 } as const;

/** safe areas in px */
export const SAFE = {
  top: 192,
  bottom: 1920 - 384, // 1536 — content must end above this
} as const;

/** horizontal grid: 72px margins -> 936px content column */
export const GRID = {
  marginX: 72,
  contentW: 1080 - 72 * 2, // 936
  /** gutter for the implicit 6-column grid (144px columns + 24px gutters) */
  gutter: 24,
  colW: (1080 - 72 * 2 - 5 * 24) / 6, // 132
} as const;

/** vertical landmarks */
export const LAYOUT = {
  headerY: 200,
  headerH: 56,
  stageTop: 300,
  stageBottom: 1452,
  stageH: 1452 - 300,
  progressY: 1486,
  progressH: 10,
} as const;

/** spacing scale (8pt) */
export const SPACE = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  xxxl: 96,
} as const;

/** type scale — px at 1080 width. line-height >= 1.45 everywhere (Telugu safe) */
export const TYPE = {
  kicker: { size: 26, lh: 1.3, weight: 700 as const, tracking: "0.16em" },
  micro: { size: 22, lh: 1.4, weight: 600 as const, tracking: "0.08em" },
  body: { size: 44, lh: 1.5, weight: 500 as const, tracking: "0em" },
  lead: { size: 56, lh: 1.5, weight: 600 as const, tracking: "0em" },
  headline: { size: 68, lh: 1.45, weight: 700 as const, tracking: "-0.01em" },
  display: { size: 84, lh: 1.45, weight: 800 as const, tracking: "-0.015em" },
  mega: { size: 104, lh: 1.3, weight: 800 as const, tracking: "-0.02em" },
} as const;

/** text size for a scene body by content length — keeps 1-line and 8-line
 * texts inside the stage without clipping */
export const sizeForText = (len: number): number => {
  if (len <= 40) return TYPE.headline.size; // punchy hook style
  if (len <= 90) return TYPE.lead.size;
  if (len <= 150) return 50;
  if (len <= 220) return 46;
  return 42;
};

export const radius = {
  sm: 12,
  md: 20,
  lg: 32,
  pill: 999,
} as const;

/** Conservative estimate of wrapped line count for mixed Telugu/English text.
 * Uses a deliberately small average glyph advance so the layout reserves more
 * height than it usually needs — text can only come out shorter, never clip. */
export const estimateLines = (text: string, fontSize: number, width: number): number => {
  const words = (text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  const avgAdvance = fontSize * 0.62; // Telugu aksharas are wide
  const perLine = Math.max(6, Math.floor(width / avgAdvance));
  // greedy wrap simulation on character counts
  let lines = 1;
  let used = 0;
  for (const w of words) {
    const len = w.length + (used > 0 ? 1 : 0);
    if (used + len > perLine) {
      lines += 1;
      used = w.length;
    } else {
      used += len;
    }
  }
  return lines;
};

export const estimateTextHeight = (text: string, fontSize: number, width: number, lineHeight: number): number =>
  estimateLines(text, fontSize, width) * fontSize * lineHeight;

/** Eased curves only — no linear motion anywhere in the template. */
export const EASE = {
  /** snappy exit-of-rest, long settle (primary entrance curve) */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** gentler entrance for text blocks */
  soft: Easing.bezier(0.22, 0.7, 0.35, 1),
  /** camera style ease-in-out for Ken Burns and background drift */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** for exits */
  in: Easing.bezier(0.55, 0, 0.85, 0.3),
  /** small overshoot for chips and badges (spring-like but deterministic) */
  pop: Easing.bezier(0.2, 1.35, 0.4, 1),
} as const;

/** frames a scene takes to enter / exit (crossfade overlap between scenes) */
export const MOTION = {
  enter: 14,
  exit: 12,
  stagger: 3,
} as const;
