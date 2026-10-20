import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { Background, PATTERNS } from "./Background";
import { FontContext, Header, SegmentedProgress, getFontFamily } from "./Parts";
import { SceneView } from "./Scenes";
import { getTheme } from "./themes";
import type { ReelProps } from "./types";

export const RadarReel: React.FC<ReelProps> = (props) => {
  const { durationInFrames } = useVideoConfig();
  const theme = getTheme(props.category);
  const font = getFontFamily(props.fontMode);
  const pattern = PATTERNS[Math.floor(props.seed / 3) % PATTERNS.length];
  const variant = props.seed % 3;

  let lineCount = 0;
  const starts: number[] = [];
  let acc = 0;
  for (const scene of props.scenes) {
    starts.push(acc);
    acc += scene.frames;
  }

  // Music ducks to 0.5 while words are spoken and returns to 1.0 in gaps.
  const duckRamp = 6;
  const speechWindows: { a: number; b: number }[] = [];
  props.scenes.forEach((scene, i) => {
    if (!scene.audio) return;
    if (scene.words && scene.words.length) {
      const raw = scene.words
        .map((w) => ({
          a: starts[i] + (w.t / 1000) * 30,
          b: starts[i] + ((w.t + w.d) / 1000) * 30,
        }))
        .sort((x, y) => x.a - y.a);
      for (const w of raw) {
        const last = speechWindows[speechWindows.length - 1];
        if (last && w.a - last.b <= 0.25 * 30) last.b = Math.max(last.b, w.b);
        else speechWindows.push({ ...w });
      }
    } else if (scene.audioSeconds) {
      speechWindows.push({
        a: starts[i] + 2,
        b: starts[i] + Math.round(scene.audioSeconds * 30) + 6,
      });
    }
  });
  const voiceCoverage = (frame: number): number => {
    let best = 0;
    for (const w of speechWindows) {
      let c: number;
      if (frame < w.a) c = 1 - (w.a - frame) / duckRamp;
      else if (frame > w.b) c = 1 - (frame - w.b) / duckRamp;
      else c = 1;
      best = Math.max(best, Math.min(1, Math.max(0, c)));
    }
    return best;
  };
  const musicVolume = (frame: number) => {
    const fade = interpolate(frame, [0, 24, durationInFrames - 36, durationInFrames], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return fade * (1 - 0.5 * voiceCoverage(frame));
  };

  return (
    <FontContext.Provider value={font}>
      <AbsoluteFill>
        <Background theme={theme} pattern={pattern} />
        {props.scenes.map((scene, i) => {
          const lineIndex = scene.kind === "line" ? lineCount++ : 0;
          return (
            <Sequence key={i} from={starts[i]} durationInFrames={scene.frames}>
              {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
              {i > 0 && props.sfx ? <Audio src={staticFile(props.sfx)} volume={0.35} /> : null}
              {props.sfxPop ? <Audio src={staticFile(props.sfxPop)} volume={0.3} /> : null}
              {scene.kind === "cta" && props.sfxDing ? (
                <Audio src={staticFile(props.sfxDing)} volume={0.3} />
              ) : null}
              <SceneView scene={scene} lineIndex={lineIndex} props={props} theme={theme} variant={variant} />
            </Sequence>
          );
        })}
        <Header brand={props.brand} categoryLabel={props.categoryLabel} theme={theme} />
        <SegmentedProgress frames={props.scenes.map((s) => s.frames)} theme={theme} />
        {props.music ? (
          <Audio src={staticFile(props.music)} loop volume={musicVolume} />
        ) : null}
      </AbsoluteFill>
    </FontContext.Provider>
  );
};
