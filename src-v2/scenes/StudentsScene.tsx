import React from "react";
import { EASE, LAYOUT, TYPE, estimateTextHeight, sizeForText } from "../design/tokens";
import { Caption } from "../components/Caption";
import { Chip, Enter, Kicker } from "../components/ui";
import { Picture } from "../components/Picture";
import type { SceneProps } from "./HookScene";
import { stage } from "./HookScene";
import { interpolate, useCurrentFrame } from "remotion";

/**
 * STUDENTS — a different rhythm from the line scenes: wide picture strip on
 * top, an overlapping pill with the audience label, then the statement with a
 * left accent rail and two meta chips at the bottom.
 */
export const StudentsScene: React.FC<SceneProps> = (props) => {
  const { scene, palette, variants, sceneFrames, badge, tagline } = props;
  const frame = useCurrentFrame();
  const textW = 936 - 64;
  let fontSize = sizeForText(scene.text.length);
  const kickerH = scene.label ? 74 : 16;
  const chipsH = 64;
  const stripH = 380;
  while (
    fontSize > 32 &&
    stripH + 60 + kickerH + estimateTextHeight(scene.text, fontSize, textW, 1.5) + chipsH + 48 > 1152
  )
    fontSize -= 2;
  const textH = estimateTextHeight(scene.text, fontSize, textW, 1.5);

  const railSweep = interpolate(frame, [10, 40], [0, 1], {
    easing: EASE.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ ...stage }}>
      <Picture
        src={scene.image}
        palette={palette}
        variants={variants}
        mask="rounded"
        box={{ width: 936, height: stripH }}
        delay={0}
      />
      {scene.label ? (
        <div style={{ position: "absolute", left: 36, top: stripH - 34, zIndex: 4 }}>
          <Chip text={scene.label} palette={palette} delay={8} />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: stripH + 60,
          display: "flex",
          gap: 26,
        }}
      >
        <div
          style={{
            width: 10,
            minHeight: textH + kickerH,
            borderRadius: 6,
            background: `linear-gradient(180deg, ${palette.accent}, ${palette.primary})`,
            transform: `scaleY(${railSweep})`,
            transformOrigin: "top",
          }}
        />
        <div style={{ flex: 1 }}>
          <Kicker label={badge} palette={palette} delay={6} />
          <div style={{ height: 22 }} />
          <Caption
            text={scene.text}
            words={scene.words}
            audioSeconds={scene.audioSeconds}
            sceneFrames={sceneFrames}
            palette={palette}
            fontSize={fontSize}
            lineHeight={1.5}
            fontWeight={700}
            maxWidth={textW}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 36,
          bottom: 0,
          display: "flex",
          gap: 16,
        }}
      >
        <Enter delay={26} from="up">
          <div
            style={{
              fontSize: TYPE.micro.size,
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "12px 24px",
              borderRadius: 999,
              background: `${palette.primary}2E`,
              border: `2px solid ${palette.primary}66`,
              color: palette.light ? palette.primary : palette.text,
            }}
          >
            {tagline}
          </div>
        </Enter>
      </div>
    </div>
  );
};
