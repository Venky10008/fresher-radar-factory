import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Theme, withAlpha } from "./themes";

export const PATTERNS = ["radar", "grid", "dots", "diagonal", "rings"] as const;
export type PatternName = (typeof PATTERNS)[number];

const PatternLayer: React.FC<{ theme: Theme; pattern: PatternName }> = ({ theme, pattern }) => {
  const frame = useCurrentFrame();
  const line = withAlpha(theme.accent, theme.isLight ? 0.16 : 0.2);
  const fade = "radial-gradient(ellipse at 50% 48%, #000 15%, transparent 72%)";

  if (pattern === "grid") {
    return (
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: `${frame * 0.5}px ${frame * 0.7}px`,
          WebkitMaskImage: fade,
          maskImage: fade,
        }}
      />
    );
  }
  if (pattern === "dots") {
    return (
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${line} 4px, transparent 5px)`,
          backgroundSize: "54px 54px",
          backgroundPosition: `${frame * 0.6}px ${frame * 0.3}px`,
          WebkitMaskImage: fade,
          maskImage: fade,
        }}
      />
    );
  }
  if (pattern === "diagonal") {
    return (
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, ${line} 0px, ${line} 3px, transparent 3px, transparent 52px)`,
          backgroundPosition: `${frame * 0.8}px 0px`,
          WebkitMaskImage: fade,
          maskImage: fade,
        }}
      />
    );
  }
  if (pattern === "rings") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {[0, 1, 2, 3].map((i) => {
          const t = ((frame + i * 45) % 180) / 180;
          const size = 300 + t * 1500;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: size,
                height: size,
                marginTop: 120,
                borderRadius: "50%",
                border: `3px solid ${withAlpha(theme.accent, (1 - t) * (theme.isLight ? 0.22 : 0.3))}`,
              }}
            />
          );
        })}
      </AbsoluteFill>
    );
  }
  // radar
  const angle = (frame * 2.2) % 360;
  const rings = [1500, 1120, 750, 380];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 1500, height: 1500, marginTop: 120 }}>
        {rings.map((size) => (
          <div
            key={size}
            style={{
              position: "absolute",
              left: (1500 - size) / 2,
              top: (1500 - size) / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `2px solid ${withAlpha(theme.accent, theme.isLight ? 0.18 : 0.2)}`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from ${angle}deg, ${withAlpha(theme.accent, 0)} 0deg, ${withAlpha(theme.accent, theme.isLight ? 0.18 : 0.26)} 60deg, ${withAlpha(theme.accent, 0)} 60.6deg, ${withAlpha(theme.accent, 0)} 360deg)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const Background: React.FC<{ theme: Theme; pattern: PatternName }> = ({ theme, pattern }) => {
  const frame = useCurrentFrame();
  const a = Math.sin(frame / 95);
  const b = Math.cos(frame / 120);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(165deg, ${theme.bg2} 0%, ${theme.bg1} 75%)` }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${30 + a * 12}% ${24 + b * 6}%, ${withAlpha(theme.accent, theme.isLight ? 0.22 : 0.3)}, transparent 70%), radial-gradient(800px 800px at ${78 - a * 10}% ${72 + b * 8}%, ${withAlpha(theme.accent2, theme.isLight ? 0.2 : 0.22)}, transparent 70%)`,
        }}
      />
      <PatternLayer theme={theme} pattern={pattern} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${withAlpha(theme.bg1, theme.isLight ? 0.35 : 0.6)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
