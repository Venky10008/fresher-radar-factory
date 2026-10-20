import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import type { ReelProps } from "../src/types";
import { MOTION } from "./design/tokens";
import { getPalette } from "./design/palettes";
import { computeVariants } from "./design/seed";
import { useFonts } from "./design/fonts";
import { Background } from "./components/Background";
import { BrandHeader } from "./components/BrandHeader";
import { Progress } from "./components/Progress";
import { SceneShell } from "./components/ui";
import { HookScene, type SceneProps } from "./scenes/HookScene";
import { LineScene } from "./scenes/LineScene";
import { StudentsScene } from "./scenes/StudentsScene";
import { CtaScene } from "./scenes/CtaScene";

/**
 * RadarReelV2 — the second, independent Fresher Radar template.
 *
 * Structure of one reel:
 *  - one persistent animated background (seed picks the pattern family)
 *  - a brand header that never moves
 *  - scene layers that crossfade with a 12-frame overlap (MOTION.exit)
 *  - a segmented progress bar just above the bottom safe edge
 *  - music that ducks under every spoken line; optional whoosh/pop/ding sfx
 */
export const RadarReelV2: React.FC<ReelProps> = (props) => {
  const fontFamily = useFonts(props.fontMode);
  const palette = getPalette(props.category);
  const variants = computeVariants(props.seed);

  const scenes = props.scenes;
  const frames = scenes.map((s) => s.frames);
  const starts: number[] = [];
  let acc = 0;
  for (const f of frames) {
    starts.push(acc);
    acc += f;
  }
  const total = Math.max(1, acc);
  const overlap = MOTION.exit;

  // ---- music ducking: find the frames where the voice is speaking ----
  const ramp = 9;
  const windows = scenes.map((s, i) =>
    s.audio && s.audioSeconds
      ? { a: starts[i] + 2, b: starts[i] + Math.round(s.audioSeconds * 30) + 6 }
      : null
  );
  const coverage = (frame: number): number => {
    let best = 0;
    for (const w of windows) {
      if (!w) continue;
      let c: number;
      if (frame < w.a) c = (w.a - frame) / ramp;
      else if (frame > w.b) c = (frame - w.b) / ramp;
      else c = 1;
      best = Math.max(best, Math.min(1, Math.max(0, c)));
    }
    return best;
  };
  const BASE_MUSIC = 0.5;
  const DUCKED_MUSIC = 0.14;
  const musicVolume = (frame: number) =>
    BASE_MUSIC + (DUCKED_MUSIC - BASE_MUSIC) * coverage(frame);

  const sceneProps = (i: number): SceneProps => ({
    scene: scenes[i],
    palette,
    variants,
    sceneIndex: i,
    sceneFrames: frames[i],
    badge: props.badge,
    tagline: props.tagline,
  });

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        backgroundColor: palette.bg,
        color: palette.text,
      }}
    >
      <Background palette={palette} pattern={variants.background} totalFrames={total} />
      <BrandHeader
        palette={palette}
        brand={props.brand}
        categoryLabel={props.categoryLabel}
      />

      {scenes.map((s, i) => {
        const isLast = i === scenes.length - 1;
        const props2 = sceneProps(i);
        return (
          <Sequence
            key={i}
            from={starts[i]}
            durationInFrames={frames[i] + (isLast ? 0 : overlap)}
            layout="none"
          >
            {s.audio ? (
              <Audio src={staticFile(s.audio)} volume={1} />
            ) : null}
            {i > 0 && props.sfx ? (
              <Audio src={staticFile(props.sfx)} volume={0.6} />
            ) : null}
            {props.sfxPop ? (
              <Audio src={staticFile(props.sfxPop)} volume={0.6} />
            ) : null}
            {s.kind === "cta" && props.sfxDing ? (
              <Sequence from={10} layout="none">
                <Audio src={staticFile(props.sfxDing)} volume={0.6} />
              </Sequence>
            ) : null}
            <SceneShell sceneFrames={frames[i]}>
              {s.kind === "hook" ? (
                <HookScene {...props2} />
              ) : s.kind === "students" ? (
                <StudentsScene {...props2} />
              ) : s.kind === "cta" ? (
                <CtaScene {...props2} />
              ) : (
                <LineScene
                  {...props2}
                  variant={(variants.line + lineIndex(s, i, scenes)) % 4}
                />
              )}
            </SceneShell>
          </Sequence>
        );
      })}

      <Progress palette={palette} starts={starts} frames={frames} />

      {props.music ? (
        <Audio src={staticFile(props.music)} volume={musicVolume} />
      ) : null}
    </AbsoluteFill>
  );
};

/** counts how many "line" scenes come before index i so layouts rotate */
const lineIndex = (scene: ReelProps["scenes"][0], i: number, scenes: ReelProps["scenes"]): number => {
  void scene;
  let n = 0;
  for (let k = 0; k < i; k++) if (scenes[k].kind === "line") n++;
  return n;
};
