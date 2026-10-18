import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Palette } from "../design/palettes";
import { EASE, LAYOUT, TYPE } from "../design/tokens";

/** Radar mark + wordmark + category chip. Sits just below the top safe edge
 * and stays on screen for the whole reel — this is the brand anchor. */
export const BrandHeader: React.FC<{
  palette: Palette;
  brand: string;
  categoryLabel: string;
}> = ({ palette, brand, categoryLabel }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 26], [0, 1], {
    easing: EASE.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const words = brand.toUpperCase().split(/\s+/);
  const mark = 44;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: LAYOUT.headerY,
        width: 1080 - 144,
        height: LAYOUT.headerH,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: p,
        transform: `translateY(${(1 - p) * -18}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width={mark} height={mark} viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="20" fill="none" stroke={palette.accent} strokeWidth="3" />
          <path
            d="M22 22 L22 6 A16 16 0 0 1 35.8 14 Z"
            fill={palette.accent}
            opacity="0.35"
          />
          <circle cx="22" cy="22" r="4" fill={palette.accent} />
          <circle cx="32" cy="13" r="3" fill={palette.accent} />
        </svg>
        <div
          style={{
            fontFamily: "inherit",
            fontSize: TYPE.micro.size + 6,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: palette.text,
            display: "flex",
            gap: 10,
          }}
        >
          {words.map((w, i) => (
            <span key={i} style={i === words.length - 1 ? { color: palette.accent } : undefined}>
              {w}
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          background: palette.accent,
          color: palette.onAccent,
          fontSize: TYPE.micro.size - 2,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "9px 20px",
          borderRadius: 999,
        }}
      >
        {categoryLabel}
      </div>
    </div>
  );
};
