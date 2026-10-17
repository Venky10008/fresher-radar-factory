import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansTelugu";
import type { ReelProps, Scene } from "./types";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "800"],
  subsets: ["telugu", "latin"],
});

const C = {
  bg1: "#0B1A1F",
  bg2: "#102B34",
  ink: "#EAF3F4",
  muted: "#9DB4B9",
  teal: "#2CC4CF",
  amber: "#F2B134",
  green: "#3DBE84",
};

// Instagram and YouTube put their own buttons on the top 10% and bottom 20%.
const SAFE_TOP = 200;
const SAFE_BOTTOM = 400;

const Radar: React.FC = () => {
  const frame = useCurrentFrame();
  const angle = (frame * 2.4) % 360;
  const rings = [1400, 1050, 700, 350];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 1400, height: 1400, marginTop: 180 }}>
        {rings.map((size) => (
          <div
            key={size}
            style={{
              position: "absolute",
              left: (1400 - size) / 2,
              top: (1400 - size) / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: "2px solid rgba(44,196,207,0.16)",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from ${angle}deg, rgba(44,196,207,0) 0deg, rgba(44,196,207,0.30) 62deg, rgba(44,196,207,0) 62.5deg, rgba(44,196,207,0) 360deg)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Header: React.FC<{ brand: string; categoryLabel: string }> = ({ brand, categoryLabel }) => {
  const frame = useCurrentFrame();
  const pulse = 0.55 + 0.45 * Math.sin(frame / 6);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_TOP,
        left: 70,
        right: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: C.teal,
            opacity: pulse,
            boxShadow: `0 0 24px ${C.teal}`,
          }}
        />
        <span style={{ color: C.ink, fontSize: 40, fontWeight: 800, letterSpacing: 0.5 }}>{brand}</span>
      </div>
      <span
        style={{
          color: C.bg1,
          background: C.teal,
          fontSize: 30,
          fontWeight: 700,
          padding: "8px 22px",
          borderRadius: 999,
        }}
      >
        {categoryLabel}
      </span>
    </div>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_TOP - 34,
        left: 70,
        right: 70,
        height: 6,
        borderRadius: 3,
        background: "rgba(234,243,244,0.14)",
      }}
    >
      <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 3, background: C.amber }} />
    </div>
  );
};

const Words: React.FC<{ text: string; frames: number; size: number }> = ({ text, frames, size }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const spread = Math.max(10, frames * 0.78);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 20px",
        padding: "0 70px",
        fontFamily,
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.5,
        textAlign: "center",
      }}
    >
      {words.map((word, i) => {
        const start = (i / words.length) * spread;
        const opacity = interpolate(frame, [start, start + 6], [0.18, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(frame, [start, start + 8], [18, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const isLatin = /[A-Za-z]/.test(word);
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${y}px)`,
              color: isLatin ? C.amber : C.ink,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const Chip: React.FC<{ label: string; color: string; textColor?: string; size?: number }> = ({
  label,
  color,
  textColor = C.bg1,
  size = 38,
}) => (
  <span
    style={{
      fontFamily,
      fontWeight: 700,
      fontSize: size,
      color: textColor,
      background: color,
      padding: "10px 30px",
      borderRadius: 999,
    }}
  >
    {label}
  </span>
);

const SceneView: React.FC<{ scene: Scene; toolName: string; pricing: string; brand: string }> = ({
  scene,
  toolName,
  pricing,
  brand,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 7], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [scene.frames - 6, scene.frames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  let content: React.ReactNode;
  if (scene.kind === "hook") {
    content = (
      <>
        {toolName ? <Chip label={toolName} color="rgba(234,243,244,0.12)" textColor={C.ink} size={40} /> : null}
        <Words text={scene.text} frames={scene.frames} size={88} />
        {pricing && pricing !== "unknown" ? (
          <Chip label={pricing} color={pricing === "free" ? C.green : C.amber} size={40} />
        ) : null}
      </>
    );
  } else if (scene.kind === "students") {
    content = (
      <>
        <Chip label="For students" color={C.teal} size={36} />
        <div
          style={{
            margin: "0 60px",
            padding: "50px 20px",
            borderRadius: 40,
            border: `3px solid ${C.teal}`,
            background: "rgba(11,26,31,0.72)",
          }}
        >
          <Words text={scene.text} frames={scene.frames} size={70} />
        </div>
      </>
    );
  } else if (scene.kind === "cta") {
    content = (
      <>
        <div style={{ fontFamily, fontWeight: 800, fontSize: 120, color: C.ink, textAlign: "center", lineHeight: 1.2 }}>
          {brand}
        </div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 56, color: C.muted, textAlign: "center" }}>
          Daily AI tools, internships, jobs
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
          <Chip label="Link in bio" color={C.teal} size={44} />
          <Chip label="Comment JOIN" color={C.amber} size={44} />
        </div>
      </>
    );
  } else {
    content = <Words text={scene.text} frames={scene.frames} size={76} />;
  }

  return (
    <AbsoluteFill
      style={{
        opacity,
        top: SAFE_TOP + 110,
        bottom: SAFE_BOTTOM,
        height: "auto",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 44,
      }}
    >
      {content}
    </AbsoluteFill>
  );
};

export const RadarReel: React.FC<ReelProps> = ({ brand, categoryLabel, toolName, pricing, scenes }) => {
  let offset = 0;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${C.bg2} 0%, ${C.bg1} 70%)` }}>
      <Radar />
      <Header brand={brand} categoryLabel={categoryLabel} />
      <Progress />
      {scenes.map((scene, i) => {
        const from = offset;
        offset += scene.frames;
        return (
          <Sequence key={i} from={from} durationInFrames={scene.frames}>
            {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
            <SceneView scene={scene} toolName={toolName} pricing={pricing} brand={brand} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
