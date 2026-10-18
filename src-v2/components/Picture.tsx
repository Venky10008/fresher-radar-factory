import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Palette } from "../design/palettes";
import { EASE, radius } from "../design/tokens";
import type { Variants } from "../design/seed";
import { Enter } from "./ui";

export type Mask = "rounded" | "arch" | "circle" | "slant";

const maskStyle = (mask: Mask): React.CSSProperties => {
  switch (mask) {
    case "arch":
      return { borderRadius: "460px 460px 28px 28px" };
    case "circle":
      return { borderRadius: "50%" };
    case "slant":
      return { clipPath: "polygon(0 6%, 100% 0, 100% 94%, 0 100%)" };
    default:
      return { borderRadius: radius.lg };
  }
};

/**
 * Picture panel: square AI art (1024x1024) cropped into the panel, slow eased
 * camera move (Ken Burns) chosen from the seed, a palette-tinted gradient
 * overlay and a hairline border so the image belongs to the design system.
 */
export const Picture: React.FC<{
  src: string | null;
  palette: Palette;
  variants: Variants;
  mask?: Mask;
  /** Ken Burns strength (1 = subtle) */
  strength?: number;
  /** style for the outer box (position/size) */
  box?: React.CSSProperties;
  delay?: number;
}> = ({ src, palette, variants, mask = "rounded", strength = 1, box, delay = 0 }) => {
  const frame = useCurrentFrame();

  if (!src) {
    return (
      <EmptyVisual palette={palette} variants={variants} mask={mask} box={box} delay={delay} />
    );
  }

  // smooth ping-pong camera travel (cosine — no wrap jump, eased at both ends)
  const t = (1 - Math.cos((frame / 210) * Math.PI * 2)) / 2;
  const dir = variants.picture;
  let scale = 1.06;
  let tx = 0;
  let ty = 0;
  if (dir === 0) scale = (1.04 + t * 0.09) * strength + (1 - strength);
  else if (dir === 1) scale = (1.13 - t * 0.09) * strength + (1 - strength);
  else if (dir === 2) {
    scale = 1.1 * strength + (1 - strength);
    tx = interpolate(t, [0, 1], [-22, 22]);
  } else {
    scale = 1.1 * strength + (1 - strength);
    tx = interpolate(t, [0, 1], [22, -22]);
    ty = 8;
  }

  return (
    <Enter delay={delay} from="up" distance={30} style={box}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          ...maskStyle(mask),
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${variants.crop}% 45%`,
            transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
            willChange: "transform",
          }}
        />
        {/* palette tint so any AI picture lands inside the colour system */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(140deg, ${palette.primary}3D 0%, transparent 45%, ${palette.bg}73 100%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: `inset 0 0 0 2px ${palette.light ? "#FFFFFFCC" : "#FFFFFF26"}`,
            borderRadius: "inherit",
          }}
        />
      </div>
    </Enter>
  );
};
/**
 * Finished-looking stand-in for scenes without a picture: a gradient panel
 * with a category motif (rings / monogram / bars) that still moves.
 */
export const EmptyVisual: React.FC<{
  palette: Palette;
  variants: Variants;
  mask?: Mask;
  /** style for the outer box (position/size) */
  box?: React.CSSProperties;
  delay?: number;
  /** letter for the monogram motif (e.g. first letter of the category) */
  glyph?: string;
}> = ({ palette, variants, mask = "rounded", box, delay = 0, glyph = "F" }) => {
  const frame = useCurrentFrame();
  // smooth ping-pong phase (cosine — wraps without a jump)
  const slow = (1 - Math.cos((frame / 300) * Math.PI * 2)) / 2;
  const motif = variants.motif;
  return (
    <Enter delay={delay} from="up" distance={30} style={box}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: `linear-gradient(150deg, ${palette.surface} 0%, ${palette.surface2} 100%)`,
          ...maskStyle(mask),
        }}
      >
        {motif === 0 ? (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 600 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <g transform={`translate(300 200) rotate(${slow * 40 - 20})`} opacity="0.9">
              {[60, 120, 180, 240].map((r, i) => (
                <circle
                  key={r}
                  r={r}
                  fill="none"
                  stroke={i % 2 === 0 ? palette.accent : palette.primary}
                  strokeOpacity={0.5 - i * 0.08}
                  strokeWidth={i % 2 === 0 ? 4 : 2}
                />
              ))}
              <path d="M 0 0 L 240 0 A 240 240 0 0 0 208 -120 Z" fill={palette.accent} opacity="0.14" />
              <circle r="14" fill={palette.accent} />
            </g>
          </svg>
        ) : motif === 1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 240,
              fontWeight: 800,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: `4px ${palette.accent}`,
              opacity: 0.55,
              transform: `translateY(${Math.sin(slow * Math.PI * 2) * 10}px)`,
            }}
          >
            {glyph}
          </div>
        ) : (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: -60,
                  left: 60 + i * 110,
                  width: 44,
                  height: 520,
                  background: i % 2 === 0 ? `${palette.accent}26` : `${palette.primary}26`,
                  transform: `rotate(24deg) translateX(${Math.sin(slow * Math.PI * 2 + i) * 8}px)`,
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                right: -80,
                bottom: -80,
                width: 300,
                height: 300,
                borderRadius: "50%",
                border: `6px solid ${palette.accent}55`,
              }}
            />
          </>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: `inset 0 0 0 2px ${palette.light ? "#FFFFFF" : "#FFFFFF1A"}`,
            borderRadius: "inherit",
          }}
        />
      </div>
    </Enter>
  );
};

