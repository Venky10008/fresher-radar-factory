import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Palette } from "../design/palettes";
import { EASE, MOTION, TYPE } from "../design/tokens";

/**
 * Shared motion primitives. Every element enters through these wrappers so
 * the whole template moves with one hand: eased, staggered, never linear.
 */

type EnterFrom = "up" | "down" | "left" | "right" | "scale";

/** staggered entrance for one element; `delay` in frames */
export const Enter: React.FC<{
  delay?: number;
  from?: EnterFrom;
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, from = "up", distance = 26, children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + MOTION.enter], [0, 1], {
    easing: EASE.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const d = (1 - p) * distance;
  const transform =
    from === "up"
      ? `translateY(${d}px)`
      : from === "down"
      ? `translateY(${-d}px)`
      : from === "left"
      ? `translateX(${d}px)`
      : from === "right"
      ? `translateX(${-d}px)`
      : `scale(${0.94 + p * 0.06})`;
  return (
    <div
      style={{
        opacity: p,
        transform,
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Scene exit: the last MOTION.exit frames crossfade the whole scene out while
 * the next scene is already fading in above it.
 */
export const SceneShell: React.FC<{
  sceneFrames: number;
  children: React.ReactNode;
}> = ({ sceneFrames, children }) => {
  const frame = useCurrentFrame();
  const exitFrom = Math.max(MOTION.enter, sceneFrames - MOTION.exit);
  const out = interpolate(frame, [exitFrom, sceneFrames], [0, 1], {
    easing: EASE.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 1 - out,
        transform: `translateY(${-24 * out}px) scale(${1 - 0.012 * out})`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
};

/** small uppercase label above a text block */
export const Kicker: React.FC<{
  label: string;
  palette: Palette;
  delay?: number;
  align?: "left" | "center";
}> = ({ label, palette, delay = 0, align = "left" }) => {
  if (!label) return null;
  return (
    <Enter delay={delay} from="left" distance={18}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          justifyContent: align === "center" ? "center" : "flex-start",
        }}
      >
        <span
          style={{
            width: 34,
            height: 4,
            borderRadius: 2,
            background: palette.accent,
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontSize: TYPE.kicker.size,
            fontWeight: TYPE.kicker.weight,
            letterSpacing: TYPE.kicker.tracking,
            textTransform: "uppercase",
            color: palette.accent,
          }}
        >
          {label}
        </span>
      </div>
    </Enter>
  );
};

/** pill chip (badge, pricing, counts) */
export const Chip: React.FC<{
  text: string;
  palette: Palette;
  delay?: number;
  filled?: boolean;
}> = ({ text, palette, delay = 0, filled = true }) => {
  if (!text) return null;
  return (
    <Enter delay={delay} from="scale" distance={0}>
      <div
        style={{
          display: "inline-block",
          fontSize: TYPE.micro.size,
          fontWeight: 700,
          letterSpacing: "0.06em",
          padding: "10px 22px",
          borderRadius: 999,
          background: filled ? palette.accent : "transparent",
          color: filled ? palette.onAccent : palette.accent,
          border: filled ? "none" : `2px solid ${palette.accent}`,
        }}
      >
        {text}
      </div>
    </Enter>
  );
};
