import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Palette } from "../design/palettes";
import { EASE, LAYOUT } from "../design/tokens";

/** Segmented progress bar: one segment per scene, filling with eased motion.
 * Sits just above the bottom safe edge (never inside the bottom 20%). */
export const Progress: React.FC<{
  palette: Palette;
  starts: number[];
  frames: number[];
}> = ({ palette, starts, frames }) => {
  const frame = useCurrentFrame();
  const gap = 10;
  const n = starts.length;
  const segW = (1080 - 144 - gap * (n - 1)) / n;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: LAYOUT.progressY,
        width: 1080 - 144,
        height: LAYOUT.progressH,
        display: "flex",
        gap,
      }}
    >
      {starts.map((start, i) => {
        const progress = interpolate(
          frame,
          [start, start + frames[i]],
          [0, 1],
          { easing: EASE.soft, extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const done = frame >= start + frames[i] ? 1 : progress;
        const before = frame < start ? 0 : 1;
        return (
          <div
            key={i}
            style={{
              position: "relative",
              flex: 1,
              borderRadius: 999,
              background: palette.light
                ? `${palette.primary}2E`
                : `${palette.text}26`,
              overflow: "hidden",
              opacity: before,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: palette.accent,
                transformOrigin: "left center",
                transform: `scaleX(${done})`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
