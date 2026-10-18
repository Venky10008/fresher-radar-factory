import React from "react";
import { Easing, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import type { TimedWord } from "../../src/types";
import type { Palette } from "../design/palettes";
import { FPS } from "../design/tokens";

/**
 * Captions that feel spoken.
 *
 * Timing sources, in order:
 *  1. scene.words whose count equals the display word count ->
 *     frame-accurate reveal from real edge-tts word boundaries
 *     (te-IN voices emit them with boundary="WordBoundary").
 *  2. scene.words with a different count -> display words are spread over the
 *     measured speech span weighted by length (char shares keep split rows of
 *     one scene in the right order).
 *  3. scene.audioSeconds -> proportional reveal over the measured clip.
 *  4. nothing -> reveal over the first ~55% of the scene (staggered + eased,
 *     never a hard pop of the whole paragraph).
 *
 * Unspoken words are invisible but keep their space, so the block never
 * reflows while it builds — no jitter. The currently spoken word is tinted
 * with the category accent and smoothly returns to the text colour.
 */

const EASE_WORD = Easing.bezier(0.22, 0.7, 0.3, 1);

const distribute = (weights: number[], fromF: number, toF: number): number[] => {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const span = Math.max(1, toF - fromF);
  const out: number[] = [];
  let acc = 0;
  for (const w of weights) {
    out.push(fromF + (acc / total) * span);
    acc += w;
  }
  return out;
};

const buildTimeline = (
  displayWords: string[],
  wordOffset: number,
  totalWords: number,
  beforeChars: number,
  totalChars: number,
  words: TimedWord[] | undefined,
  audioSeconds: number | undefined,
  sceneFrames: number,
  leadFrames: number
): number[] => {
  const count = displayWords.length;
  const rowChars = displayWords.join(" ").length;
  const weights = displayWords.map((w) => w.length + 1);
  const shareStart = totalChars > 0 ? beforeChars / totalChars : 0;
  const shareEnd = totalChars > 0 ? (beforeChars + rowChars) / totalChars : 1;

  if (words && words.length > 0) {
    if (totalWords === words.length && wordOffset + count <= words.length) {
      // exact word-boundary mapping for this caption
      return words.slice(wordOffset, wordOffset + count).map((w) => (w.t / 1000) * FPS);
    }
    // measured span, weighted by character shares (split rows stay ordered)
    const firstF = (words[0].t / 1000) * FPS;
    const lastW = words[words.length - 1];
    const endF = ((lastW.t + lastW.d) / 1000) * FPS;
    return distribute(
      weights,
      firstF + (endF - firstF) * shareStart,
      firstF + (endF - firstF) * shareEnd
    );
  }

  const fallbackEnd =
    audioSeconds && audioSeconds > 0.4
      ? Math.max(0.5, audioSeconds - 0.08) * FPS
      : Math.max(leadFrames + 12, sceneFrames * 0.55);
  const fallbackStart = audioSeconds && audioSeconds > 0.4 ? 0.12 * FPS : leadFrames;
  return distribute(
    weights,
    fallbackStart + (fallbackEnd - fallbackStart) * shareStart,
    fallbackStart + (fallbackEnd - fallbackStart) * shareEnd
  );
};
export const Caption: React.FC<{
  text: string;
  words?: TimedWord[];
  audioSeconds?: number;
  /** length of the scene in frames (relative to sequence start) */
  sceneFrames: number;
  /** frames before the first word starts speaking */
  leadFrames?: number;
  /** how many display words precede this caption inside the scene (split rows) */
  wordOffset?: number;
  /** total display words of the whole scene text */
  totalWords?: number;
  /** characters before this caption inside the scene text */
  beforeChars?: number;
  /** total characters of the whole scene text */
  totalChars?: number;
  palette: Palette;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  align?: "left" | "center";
  letterSpacing?: string;
  color?: string;
  maxWidth?: number;
}> = ({
  text,
  words,
  audioSeconds,
  sceneFrames,
  leadFrames = 5,
  wordOffset = 0,
  totalWords,
  beforeChars = 0,
  totalChars = 0,
  palette,
  fontSize,
  lineHeight,
  fontWeight,
  align = "left",
  letterSpacing = "0em",
  color,
  maxWidth,
}) => {
  const frame = useCurrentFrame();
  const displayWords = (text || "").split(/\s+/).filter(Boolean);
  if (displayWords.length === 0) return null;

  const timeline = buildTimeline(
    displayWords,
    wordOffset,
    totalWords ?? displayWords.length,
    beforeChars,
    totalChars,
    words,
    audioSeconds,
    sceneFrames,
    leadFrames
  );

  const baseColor = color ?? palette.text;
  return (
    <div
      style={{
        fontFamily: "inherit",
        fontSize,
        lineHeight,
        fontWeight,
        letterSpacing,
        textAlign: align,
        color: baseColor,
        maxWidth,
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        hyphens: "none",
      }}
    >
      {displayWords.map((w, i) => {
        const start = timeline[i];
        const nextStart = i + 1 < timeline.length ? timeline[i + 1] : start + 14;
        const reveal = interpolate(frame, [start, start + 7], [0, 1], {
          easing: EASE_WORD,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const rise = interpolate(frame, [start, start + 3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const decay = interpolate(frame, [nextStart + 4, nextStart + 14], [1, 0], {
          easing: Easing.out(Easing.quad),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const highlight = Math.min(rise, decay);
        const wordColor =
          highlight > 0.01
            ? interpolateColors(highlight, [0, 1], [baseColor, palette.accent])
            : baseColor;
        return (
          <span key={i}>
            <span
              style={{
                display: "inline-block",
                opacity: reveal,
                transform: `translateY(${(1 - reveal) * 14}px)`,
                color: wordColor,
                willChange: "transform, opacity",
              }}
            >
              {w}
            </span>
            {i < displayWords.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
};

