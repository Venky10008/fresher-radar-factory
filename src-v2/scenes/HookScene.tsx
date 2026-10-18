import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "../../src/types";
import type { Palette } from "../design/palettes";
import type { Variants } from "../design/seed";
import { EASE, LAYOUT, TYPE, sizeForText } from "../design/tokens";
import { Caption } from "../components/Caption";
import { Chip, Enter } from "../components/ui";

export type SceneProps = {
  scene: Scene;
  palette: Palette;
  variants: Variants;
  sceneIndex: number;
  sceneFrames: number;
  badge: string;
  tagline: string;
};

export const stage: React.CSSProperties = {
  position: "absolute",
  left: 72,
  top: LAYOUT.stageTop,
  width: 1080 - 144,
  height: LAYOUT.stageH,
};

/**
 * HOOK — three arrangements chosen by the seed:
 *  0 centered stack with an underline sweep
 *  1 bottom-left block with a vertical rail + ghost glyph
 *  2 statement inside a card that wipes open
 */
export const HookScene: React.FC<SceneProps> = (props) => {
  const { palette, variants, scene, sceneFrames } = props;
  const variant = variants.hook;
  const frame = useCurrentFrame();
  const fontSize = Math.min(sizeForText(scene.text.length), TYPE.display.size);
  const ghost = (props.badge || "F").charAt(0).toUpperCase();

  const sweep = interpolate(frame, [16, 44], [0, 1], {
    easing: EASE.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (variant === 0) {
    return (
      <div
        style={{
          ...stage,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        <Enter delay={2} from="scale" distance={0}>
          <Chip text={props.badge || props.tagline} palette={palette} />
        </Enter>
        <div style={{ position: "relative", width: 940, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              top: -70,
              right: -20,
              fontSize: 300,
              fontWeight: 800,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: `3px ${palette.accent}`,
              opacity: 0.16,
            }}
          >
            {ghost}
          </div>
          <Caption
            text={scene.text}
            words={scene.words}
            audioSeconds={scene.audioSeconds}
            sceneFrames={sceneFrames}
            palette={palette}
            fontSize={fontSize}
            lineHeight={1.45}
            fontWeight={800}
            align="center"
            letterSpacing="-0.015em"
            maxWidth={900}
          />
        </div>
        <div
          style={{
            width: 260 * sweep,
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${palette.accent}, ${palette.primary})`,
          }}
        />
        <Enter delay={26} from="up">
          <div
            style={{
              fontSize: TYPE.micro.size + 2,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: palette.textMuted,
              textAlign: "center",
            }}
          >
            {props.tagline}
          </div>
        </Enter>
      </div>
    );
  }
  if (variant === 1) {
    return (
      <div
        style={{
          ...stage,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 40,
          gap: 30,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 20,
            right: -10,
            fontSize: 340,
            fontWeight: 800,
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: `4px ${palette.primary}`,
            opacity: 0.14,
          }}
        >
          {ghost}
        </div>
        <Enter delay={2} from="left" distance={20}>
          <Chip text={props.badge || props.tagline} palette={palette} />
        </Enter>
        <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
          <div
            style={{
              width: 10,
              borderRadius: 6,
              background: `linear-gradient(180deg, ${palette.accent}, ${palette.primary})`,
              transform: `scaleY(${sweep})`,
              transformOrigin: "top",
            }}
          />
          <div style={{ flex: 1 }}>
            <Caption
              text={scene.text}
              words={scene.words}
              audioSeconds={scene.audioSeconds}
              sceneFrames={sceneFrames}
              palette={palette}
              fontSize={fontSize}
              lineHeight={1.45}
              fontWeight={800}
              letterSpacing="-0.015em"
              maxWidth={840}
            />
          </div>
        </div>
        <Enter delay={26} from="up">
          <div
            style={{
              fontSize: TYPE.micro.size + 2,
              fontWeight: 600,
              color: palette.textMuted,
              paddingLeft: 38,
            }}
          >
            {props.tagline}
          </div>
        </Enter>
      </div>
    );
  }

  // variant 2 — statement inside a card that wipes open
  const wipe = interpolate(frame, [4, 26], [0, 1], {
    easing: EASE.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        ...stage,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 34,
      }}
    >
      <Enter delay={2} from="left" distance={18}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 52, height: 6, borderRadius: 3, background: palette.accent }} />
          <span
            style={{
              fontSize: TYPE.kicker.size,
              fontWeight: 700,
              letterSpacing: TYPE.kicker.tracking,
              textTransform: "uppercase",
              color: palette.accent,
            }}
          >
            {props.badge || props.tagline}
          </span>
        </div>
      </Enter>
      <div
        style={{
          position: "relative",
          background: palette.light ? "rgba(255,255,255,0.94)" : `${palette.surface}E6`,
          borderTop: `6px solid ${palette.accent}`,
          borderRadius: 28,
          padding: "56px 52px 60px",
          clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0 round 28px)`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
        }}
      >
        <Caption
          text={scene.text}
          words={scene.words}
          audioSeconds={scene.audioSeconds}
          sceneFrames={sceneFrames}
          palette={palette}
          fontSize={fontSize}
          lineHeight={1.45}
          fontWeight={800}
          letterSpacing="-0.015em"
          maxWidth={820}
        />
        <div
          style={{
            marginTop: 34,
            width: 180 * sweep,
            height: 8,
            borderRadius: 4,
            background: palette.accent,
          }}
        />
      </div>
      <Enter delay={28} from="up">
        <div style={{ fontSize: TYPE.micro.size + 2, fontWeight: 600, color: palette.textMuted }}>
          {props.tagline}
        </div>
      </Enter>
    </div>
  );
};

