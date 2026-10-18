import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Palette } from "../design/palettes";
import { EASE, FRAME } from "../design/tokens";
import { makeRng } from "../design/seed";

/**
 * Persistent background: one gradient base, one seed-picked pattern family,
 * a vignette and a static grain. It lives for the whole reel (scenes change
 * on top of it) which is what makes the video feel continuous instead of a
 * slideshow of slides.
 */

const Grain = React.memo(() => {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">` +
      `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>` +
      `<feColorMatrix type="saturate" values="0"/></filter>` +
      `<rect width="240" height="240" filter="url(#n)" opacity="0.55"/></svg>`
  );
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: "240px 240px",
        opacity: 0.05,
        pointerEvents: "none",
      }}
    />
  );
});

const Vignette: React.FC<{ palette: Palette }> = ({ palette }) => (
  <AbsoluteFill
    style={{
      background: palette.light
        ? "radial-gradient(120% 90% at 50% 45%, rgba(10,27,51,0) 55%, rgba(10,27,51,0.14) 100%)"
        : "radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 100%)",
      pointerEvents: "none",
    }}
  />
);

/** 0: radar arcs — the brand signature (Fresher *Radar*) */
const PatternRadar: React.FC<{ palette: Palette; phase: number }> = ({ palette, phase }) => {
  const cx = 860;
  const cy = 420;
  return (
    <AbsoluteFill style={{ opacity: 0.5 }}>
      <svg width={FRAME.W} height={FRAME.H} viewBox={`0 0 ${FRAME.W} ${FRAME.H}`}>
        {[210, 360, 510, 660, 810].map((r, i) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={palette.primary}
            strokeOpacity={0.22 - i * 0.03}
            strokeWidth={2}
          />
        ))}
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1={cx}
            y1={cy}
            x2={cx + 880 * Math.cos(((a + phase * 6) * Math.PI) / 180)}
            y2={cy + 880 * Math.sin(((a + phase * 6) * Math.PI) / 180)}
            stroke={palette.primary}
            strokeOpacity={0.1}
            strokeWidth={2}
          />
        ))}
        <g transform={`rotate(${phase * 36} ${cx} ${cy})`}>
          <path
            d={`M ${cx} ${cy} L ${cx + 810} ${cy} A 810 810 0 0 0 ${cx + 810 * Math.cos(-0.5)} ${
              cy + 810 * Math.sin(-0.5)
            } Z`}
            fill={`url(#sweep-${palette.id})`}
            opacity={0.5}
          />
        </g>
        <defs>
          <radialGradient
            id={`sweep-${palette.id}`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0" stopColor={palette.accent} stopOpacity="0.32" />
            <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </AbsoluteFill>
  );
};
/** 1: fine grid + drifting glow orbs */
const PatternGrid: React.FC<{ palette: Palette; phase: number }> = ({ palette, phase }) => {
  const drift = Math.sin(phase * Math.PI * 2);
  const drift2 = Math.cos(phase * Math.PI * 2);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${palette.primary}18 1px, transparent 1px), linear-gradient(90deg, ${palette.primary}18 1px, transparent 1px)`,
          backgroundSize: "54px 54px",
          opacity: 0.5,
          transform: `translate(${drift * 10}px, ${drift2 * 8}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${palette.primary}44 0%, transparent 70%)`,
          top: 60 + drift * 40,
          left: -160 + drift2 * 30,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${palette.accent}30 0%, transparent 70%)`,
          bottom: 180 + drift2 * 50,
          right: -240 + drift * 30,
        }}
      />
    </AbsoluteFill>
  );
};

/** 2: diagonal streak field with a slow light sweep */
const PatternStreaks: React.FC<{ palette: Palette; phase: number }> = ({ palette, phase }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(115deg, ${palette.primary}1F 0px, ${palette.primary}1F 3px, transparent 3px, transparent 34px)`,
        transform: `translate(${interpolate(phase, [0, 1], [-60, 60])}px, 0px)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        top: -400,
        left: interpolate(phase, [0, 1], [-700, 900]),
        width: 560,
        height: 2720,
        background: `linear-gradient(90deg, transparent, ${palette.accent}16, transparent)`,
        transform: "rotate(18deg)",
      }}
    />
  </AbsoluteFill>
);

/** 3: dot matrix with parallax + a highlighted cluster */
const PatternDots: React.FC<{ palette: Palette; phase: number }> = ({ palette, phase }) => {
  const y = Math.sin(phase * Math.PI * 2) * 18;
  const rng = makeRng(4242);
  const hot = Array.from({ length: 7 }, () => ({
    x: 120 + Math.floor(rng() * 840),
    y: 320 + Math.floor(rng() * 1000),
    r: 7 + rng() * 12,
  }));
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${palette.primary}55 2.5px, transparent 2.5px)`,
          backgroundSize: "34px 34px",
          transform: `translateY(${y}px)`,
          opacity: 0.55,
        }}
      />
      {hot.map((h, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: h.x,
            top: h.y + y * 1.6,
            width: h.r * 2,
            height: h.r * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${palette.accent}88 0%, transparent 70%)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const Background: React.FC<{
  palette: Palette;
  /** 0..3 pattern family */
  pattern: number;
  /** total frames of the reel (for slow phases) */
  totalFrames: number;
}> = ({ palette, pattern, totalFrames }) => {
  const frame = useCurrentFrame();
  const total = Math.max(1, totalFrames);
  // slow, eased ping-pong phase 0..1 (never a linear crawl)
  const raw = (frame % total) / total;
  const phase = interpolate(raw, [0, 0.5, 1], [0, 1, 0], {
    easing: EASE.inOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(155deg, ${palette.bg} 0%, ${palette.bgAlt} 100%)`,
        }}
      />
      {pattern === 0 ? (
        <PatternRadar palette={palette} phase={phase} />
      ) : pattern === 1 ? (
        <PatternGrid palette={palette} phase={phase} />
      ) : pattern === 2 ? (
        <PatternStreaks palette={palette} phase={phase} />
      ) : (
        <PatternDots palette={palette} phase={phase} />
      )}
      <Vignette palette={palette} />
      <Grain />
    </AbsoluteFill>
  );
};

