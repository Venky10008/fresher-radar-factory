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

  let offset = 0;
  let lineCount = 0;
  return (
    <FontContext.Provider value={font}>
      <AbsoluteFill>
        <Background theme={theme} pattern={pattern} />
        {props.scenes.map((scene, i) => {
          const from = offset;
          offset += scene.frames;
          const lineIndex = scene.kind === "line" ? lineCount++ : 0;
          return (
            <Sequence key={i} from={from} durationInFrames={scene.frames}>
              {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
              <SceneView scene={scene} lineIndex={lineIndex} props={props} theme={theme} variant={variant} />
            </Sequence>
          );
        })}
        <Header brand={props.brand} categoryLabel={props.categoryLabel} theme={theme} />
        <SegmentedProgress frames={props.scenes.map((s) => s.frames)} theme={theme} />
        {props.music ? (
          <Audio
            src={staticFile(props.music)}
            loop
            volume={(f) =>
              interpolate(f, [0, 24, durationInFrames - 36, durationInFrames], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            }
          />
        ) : null}
      </AbsoluteFill>
    </FontContext.Provider>
  );
};
