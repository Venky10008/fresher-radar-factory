/**
 * Deterministic variation from the seed so every reel looks different while
 * remaining reproducible (same seed -> same video).
 */
export type Variants = {
  /** which background pattern family to draw */
  background: 0 | 1 | 2 | 3;
  /** which hook arrangement to use (3 arrangements) */
  hook: 0 | 1 | 2;
  /** first line-scene layout; scene i uses (line + i) % 4 */
  line: 0 | 1 | 2 | 3;
  /** Ken Burns direction on pictures: 0=zoom-in 1=zoom-out 2=pan-right 3=pan-left */
  picture: 0 | 1 | 2 | 3;
  /** motion flavour: slight differences in stagger + entrance distance */
  motion: 0 | 1 | 2;
  /** where the picture crop anchors (object-position) */
  crop: number;
  /** which accent shape decorates empty panels */
  motif: 0 | 1 | 2;
};

export const makeRng = (seed: number): (() => number) => {
  let s = (seed >>> 0) || 123456789;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
};

const int = (rng: () => number, n: number): number => Math.floor(rng() * n);

export const computeVariants = (seed: number): Variants => {
  const rng = makeRng(seed);
  return {
    background: int(rng, 4) as 0 | 1 | 2 | 3,
    hook: int(rng, 3) as 0 | 1 | 2,
    line: int(rng, 4) as 0 | 1 | 2 | 3,
    picture: int(rng, 4) as 0 | 1 | 2 | 3,
    motion: int(rng, 3) as 0 | 1 | 2,
    crop: 25 + int(rng, 51), // 25..75 (%)
    motif: int(rng, 3) as 0 | 1 | 2,
  };
};

/** stable per-scene jitter (0..1) derived from seed + scene index */
export const sceneJitter = (seed: number, i: number, salt = 0): number => {
  const rng = makeRng(seed * 31 + i * 7919 + salt * 104729);
  return rng();
};
