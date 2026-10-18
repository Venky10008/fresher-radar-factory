import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansTelugu";
import { Icon, IconName } from "./Icons";
import { Theme, withAlpha } from "./themes";

// ---------- fonts ----------
let webFont: string | null = null;
export const getFontFamily = (mode: "web" | "local"): string => {
  if (mode === "local") return "'Noto Sans Telugu', sans-serif";
  if (!webFont) {
    const f = loadFont("normal", { weights: ["500", "700", "800"], subsets: ["telugu", "latin"] });
    webFont = `${f.fontFamily}, sans-serif`;
  }
  return webFont;
};
export const FontContext = createContext<string>("'Noto Sans Telugu', sans-serif");

// ---------- layout ----------
export const SAFE_TOP = 190;
export const AREA_TOP = 320;
export const AREA_BOTTOM = 1500; // Instagram and YouTube buttons cover the bottom 20%
export const SIDE = 70;
export const WIDTH = 1080 - SIDE * 2;
const GAP = 34;

/** Rough text height so the picture and the text card share the screen sensibly */
export const estimatePanel = (text: string, size: number, hasLabel: boolean): number => {
  const charsPerLine = Math.max(8, Math.floor((WIDTH - 130) / (size * 0.53)));
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let len = 0;
  for (const w of words) {
    if (len + w.length + 1 > charsPerLine) {
      lines += 1;
      len = w.length;
    } else {
      len += w.length + 1;
    }
  }
  const labelH = hasLabel ? 96 : 0;
  return Math.round(Math.min(780, Math.max(300, 100 + labelH + lines * size * 1.5)));
};

export const fontSizeFor = (text: string, base: number): number => {
  const n = text.length;
  if (n <= 34) return base;
  if (n <= 60) return Math.round(base * 0.92);
  if (n <= 90) return Math.round(base * 0.82);
  if (n <= 125) return Math.round(base * 0.72);
  return Math.round(base * 0.64);
};

export const split = (variant: number, panelH: number) => {
  const total = AREA_BOTTOM - AREA_TOP;
  const imgH = total - panelH - GAP;
  if (variant === 1) {
    return { panelTop: AREA_TOP, imgTop: AREA_TOP + panelH + GAP, imgH };
  }
  return { imgTop: AREA_TOP, imgH, panelTop: AREA_TOP + imgH + GAP };
};

// ---------- small pieces ----------
export const RadarMark: React.FC<{ size: number; theme: Theme }> = ({ size, theme }) => {
  const frame = useCurrentFrame();
  const angle = (frame * 5) % 360;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `${Math.max(2, size / 14)}px solid ${theme.accent}`,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: size * 0.14,
          borderRadius: "50%",
          border: `${Math.max(1.5, size / 24)}px solid ${withAlpha(theme.accent, 0.55)}`,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `conic-gradient(from ${angle}deg, ${withAlpha(theme.accent2, 0)} 0deg, ${withAlpha(theme.accent2, 0.85)} 70deg, ${withAlpha(theme.accent2, 0)} 71deg, ${withAlpha(theme.accent2, 0)} 360deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: size * 0.5 - size * 0.07,
          top: size * 0.5 - size * 0.07,
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: "50%",
          background: theme.accent2,
        }}
      />
    </div>
  );
};

export const Header: React.FC<{ brand: string; categoryLabel: string; theme: Theme }> = ({
  brand,
  categoryLabel,
  theme,
}) => {
  const font = useContext(FontContext);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_TOP,
        left: SIDE,
        right: SIDE,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: font,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <RadarMark size={58} theme={theme} />
        <span style={{ color: theme.ink, fontSize: 42, fontWeight: 800, letterSpacing: 0.3 }}>{brand}</span>
      </div>
      <span
        style={{
          color: theme.onAccent,
          background: theme.accent,
          fontSize: 30,
          fontWeight: 700,
          padding: "9px 26px",
          borderRadius: 999,
        }}
      >
        {categoryLabel}
      </span>
    </div>
  );
};

export const SegmentedProgress: React.FC<{ frames: number[]; theme: Theme }> = ({ frames, theme }) => {
  const frame = useCurrentFrame();
  let start = 0;
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_TOP - 38,
        left: SIDE,
        right: SIDE,
        display: "flex",
        gap: 10,
      }}
    >
      {frames.map((f, i) => {
        const from = start;
        start += f;
        const pct = Math.max(0, Math.min(1, (frame - from) / f));
        return (
          <div
            key={i}
            style={{
              flex: f,
              height: 7,
              borderRadius: 4,
              background: withAlpha(theme.ink, 0.18),
              overflow: "hidden",
            }}
          >
            <div style={{ width: `${pct * 100}%`, height: "100%", background: theme.accent2, borderRadius: 4 }} />
          </div>
        );
      })}
    </div>
  );
};

export const Chip: React.FC<{
  label: string;
  bg: string;
  color: string;
  size?: number;
  icon?: IconName;
  iconColor?: string;
}> = ({ label, bg, color, size = 36, icon, iconColor }) => {
  const font = useContext(FontContext);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        fontFamily: font,
        fontWeight: 700,
        fontSize: size,
        color,
        background: bg,
        padding: `${size * 0.26}px ${size * 0.8}px`,
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {icon ? <Icon name={icon} size={size * 0.95} color={iconColor ?? color} /> : null}
      {label}
    </span>
  );
};

export const Words: React.FC<{
  text: string;
  frames: number;
  size: number;
  theme: Theme;
  align?: "left" | "center";
  delay?: number;
}> = ({ text, frames, size, theme, align = "left", delay = 8 }) => {
  const font = useContext(FontContext);
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const spread = Math.max(12, frames * 0.74 - delay);
  const highlight = theme.isLight ? theme.accent : theme.accent2;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: `0px ${size * 0.3}px`,
        fontFamily: font,
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.5,
        textAlign: align,
      }}
    >
      {words.map((word, i) => {
        const start = delay + (i / words.length) * spread;
        const opacity = interpolate(frame, [start, start + 6], [0.16, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(frame, [start, start + 9], [16, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const isLatin = /[A-Za-z0-9]/.test(word);
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${y}px)`,
              color: isLatin ? highlight : theme.ink,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ---------- picture card ----------
const MotionArt: React.FC<{ theme: Theme; icon: IconName; seed: number }> = ({ theme, icon, seed }) => {
  const frame = useCurrentFrame();
  const s = (seed % 7) + 1;
  const dots = [0, 1, 2, 3, 4].map((i) => {
    const x = ((i * 37 + s * 53) % 100) + Math.sin((frame + i * 20) / 40) * 3;
    const y = ((i * 61 + s * 29) % 100) + Math.cos((frame + i * 33) / 50) * 3;
    const r = 80 + ((i * 47 + s * 13) % 140);
    return { x, y, r, c: i % 2 === 0 ? theme.accent : theme.accent2 };
  });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}>
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.r * 2,
            height: d.r * 2,
            marginLeft: -d.r,
            marginTop: -d.r,
            borderRadius: "50%",
            background: withAlpha("#FFFFFF", 0.14),
            border: `3px solid ${withAlpha("#FFFFFF", 0.22)}`,
          }}
        />
      ))}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 84,
            background: withAlpha("#FFFFFF", 0.2),
            border: `3px solid ${withAlpha("#FFFFFF", 0.4)}`,
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
            transform: `translateY(${Math.sin(frame / 26) * 10}px)`,
            boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
          }}
        >
          <Icon name={icon} size={170} color="#FFFFFF" inner={theme.accent} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const PictureCard: React.FC<{
  src: string | null;
  theme: Theme;
  icon: IconName;
  seed: number;
  frames: number;
  height: number;
  top: number;
  flip: boolean;
  radius?: number;
}> = ({ src, theme, icon, seed, frames, height, top, flip, radius = 48 }) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / Math.max(1, frames));
  const scale = flip ? 1.14 - progress * 0.1 : 1.04 + progress * 0.1;
  const dx = (flip ? 1 : -1) * (progress - 0.5) * 30;
  return (
    <div
      style={{
        position: "absolute",
        left: SIDE,
        top,
        width: WIDTH,
        height,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: theme.shadow,
        border: `2px solid ${theme.cardBorder}`,
        background: theme.bg2,
      }}
    >
      {src ? (
        <div style={{ position: "absolute", inset: 0, transform: `scale(${scale}) translateX(${dx}px)` }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <MotionArt theme={theme} icon={icon} seed={seed} />
      )}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${withAlpha("#000000", 0.0)} 55%, ${withAlpha("#000000", 0.38)} 100%)`,
        }}
      />
    </div>
  );
};

// ---------- text card ----------
export const TextCard: React.FC<{
  theme: Theme;
  label: string;
  icon: IconName;
  text: string;
  frames: number;
  size: number;
  top: number;
  height: number;
  align?: "left" | "center";
}> = ({ theme, label, icon, text, frames, size, top, height, align = "left" }) => {
  const font = useContext(FontContext);
  return (
    <div
      style={{
        position: "absolute",
        left: SIDE,
        top,
        width: WIDTH,
        height,
        boxSizing: "border-box",
        padding: "44px 52px 40px 60px",
        borderRadius: 48,
        background: theme.card,
        border: `2px solid ${theme.cardBorder}`,
        boxShadow: theme.shadow,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 44,
          bottom: 44,
          width: 10,
          borderRadius: 5,
          background: `linear-gradient(180deg, ${theme.accent}, ${theme.accent2})`,
        }}
      />
      {label ? (
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: align === "center" ? "center" : "flex-start" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: theme.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={icon} size={34} color={theme.onAccent} inner={theme.accent} />
          </div>
          <span style={{ fontFamily: font, fontSize: 34, fontWeight: 700, color: theme.muted }}>{label}</span>
        </div>
      ) : null}
      <Words text={text} frames={frames} size={size} theme={theme} align={align} />
    </div>
  );
};
