import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "../../src/types";
import type { Palette } from "../design/palettes";
import { EASE, LAYOUT, TYPE, estimateTextHeight, sizeForText } from "../design/tokens";
import { Caption } from "../components/Caption";
import { Kicker } from "../components/ui";
import { EmptyVisual, Picture } from "../components/Picture";
import type { SceneProps } from "./HookScene";
import { stage } from "./HookScene";

/** shrink font until the block provably fits the given height */
const fitFontSize = (
  text: string,
  width: number,
  reserved: number,
  start: number
): number => {
  let size = start;
  while (size > 32 && estimateTextHeight(text, size, width, 1.5) > reserved) size -= 2;
  return size;
};

/**
 * LINE — four clearly different layouts. The seed picks the first one and
 * each following line scene rotates through them, so one reel already shows
 * a designed sequence rather than one slide repeated:
 *  0 hero panel     — picture on top, text card overlapping it
 *  1 full bleed     — picture fills the frame, text sits on a scrim
 *  2 editorial      — centered statement with a circular portrait
 *  3 stacked cards  — text split into staggered rows + a tilted sticker
 */
export const LineScene: React.FC<SceneProps & { variant: number }> = (props) => {
  const { scene, palette, variants, sceneFrames, sceneIndex, variant } = props;

  if (variant === 1) return <FullBleed {...props} />;
  if (variant === 2) return <Editorial {...props} />;
  if (variant === 3) return <Stacked {...props} />;
  return <Hero {...props} />;
};

/** 0 — picture panel on top, text card overlapping its bottom edge */
const Hero: React.FC<SceneProps & { variant: number }> = (props) => {
  const { scene, palette, variants, sceneFrames, sceneIndex } = props;
  const textW = 936 - 96; // card padding 48 each side
  const cardPadV = 52;
  const kickerH = scene.label ? 68 : 12;
  let fontSize = sizeForText(scene.text.length);
  const cardHFor = (s: number) =>
    estimateTextHeight(scene.text, s, textW, 1.5) + kickerH + cardPadV * 2;
  while (fontSize > 32 && cardHFor(fontSize) > 1152 - 300 + 56) fontSize -= 2;
  const cardH = cardHFor(fontSize);
  const imageH = Math.round(Math.min(660, Math.max(300, 1152 - cardH + 56)));

  return (
    <div style={{ ...stage }}>
      <Picture
        src={scene.image}
        palette={palette}
        variants={variants}
        mask={variants.motif === 2 ? "slant" : "rounded"}
        box={{ width: 936, height: imageH }}
        delay={0}
      />
      <div
        style={{
          position: "relative",
          marginTop: -56,
          background: palette.light ? "rgba(255,255,255,0.96)" : `${palette.surface}F2`,
          border: palette.light
            ? `1px solid ${palette.primary}26`
            : `1px solid #FFFFFF1F`,
          borderLeft: `10px solid ${palette.accent}`,
          borderRadius: 26,
          padding: `${cardPadV}px 48px`,
          boxShadow: palette.light
            ? "0 24px 60px rgba(10,27,51,0.14)"
            : "0 24px 60px rgba(0,0,0,0.35)",
          minHeight: cardH,
        }}
      >
        <Kicker label={scene.label} palette={palette} delay={6} />
        <div style={{ height: 18 }} />
        <Caption
          text={scene.text}
          words={scene.words}
          audioSeconds={scene.audioSeconds}
          sceneFrames={sceneFrames}
          palette={palette}
          fontSize={fontSize}
          lineHeight={1.5}
          fontWeight={600}
          maxWidth={textW}
        />
      </div>
      <IndexTag index={sceneIndex} palette={palette} style={{ position: "absolute", right: 8, top: imageH + 74 }} />
    </div>
  );
};

/** small "02" index marker used by some layouts */
const IndexTag: React.FC<{
  index: number;
  palette: Palette;
  style?: React.CSSProperties;
}> = ({ index, palette, style }) => (
  <div
    style={{
      fontSize: TYPE.micro.size,
      fontWeight: 700,
      letterSpacing: "0.14em",
      color: palette.textMuted,
      opacity: 0.85,
      ...style,
    }}
  >
    {String(index + 1).padStart(2, "0")}
  </div>
);
/** 1 — full-bleed picture, text on a scrim, big outlined index */
const FullBleed: React.FC<SceneProps & { variant: number }> = (props) => {
  const { scene, palette, variants, sceneFrames, sceneIndex } = props;
  const textW = 860;
  let fontSize = sizeForText(scene.text.length);
  const kickerH = scene.label ? 66 : 10;
  while (
    fontSize > 32 &&
    estimateTextHeight(scene.text, fontSize, textW, 1.5) + kickerH > 1152 - 60
  )
    fontSize -= 2;
  const scrim = palette.light ? "#EDF3FF" : palette.bg;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Picture
        src={scene.image}
        palette={palette}
        variants={variants}
        mask="rounded"
        box={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }}
        delay={0}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: 640,
          background: `linear-gradient(180deg, ${scrim} 12%, ${scrim}D9 46%, transparent 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1080,
          height: 1000,
          background: `linear-gradient(0deg, ${scim(palette)} 34%, ${scim(palette)}D9 62%, transparent 100%)`,
        }}
      />
      <div
        style={{
          ...stage,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 24,
          gap: 26,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 0,
            fontSize: 170,
            fontWeight: 800,
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: `4px ${palette.accent}`,
            opacity: 0.55,
          }}
        >
          {String(sceneIndex + 1).padStart(2, "0")}
        </div>
        <div style={{ display: "flex", gap: 26, alignItems: "stretch" }}>
          <div
            style={{
              width: 10,
              borderRadius: 6,
              background: `linear-gradient(180deg, ${palette.accent}, ${palette.primary})`,
            }}
          />
          <div style={{ flex: 1 }}>
            <Kicker label={scene.label} palette={palette} delay={4} />
            <div style={{ height: 16 }} />
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
      </div>
    </div>
  );
};

/** bottom scrim colour with alpha baked in */
const scim = (p: Palette): string => `${p.light ? p.bg : p.bg}F2`;

/** 2 — editorial: centered statement with a circular portrait + dashed ring */
const Editorial: React.FC<SceneProps & { variant: number }> = (props) => {
  const { scene, palette, variants, sceneFrames } = props;
  const frame = useCurrentFrame();
  const textW = 800;
  const kickerH = scene.label ? 64 : 8;
  const D = 300;
  let fontSize = sizeForText(scene.text.length);
  const total = (s: number) =>
    kickerH + D + 96 + estimateTextHeight(scene.text, s, textW, 1.5);
  while (fontSize > 32 && total(fontSize) > 1120) fontSize -= 2;
  // slow eased oscillation of the dashed ring (no wrap jump)
  const ring = Math.sin((frame / 420) * Math.PI * 2) * 24;

  return (
    <div
      style={{
        ...stage,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22, width: 620 }}>
        <div style={{ flex: 1, height: 3, background: `${palette.primary}66` }} />
        <Kicker label={scene.label} palette={palette} delay={4} />
        <div style={{ flex: 1, height: 3, background: `${palette.primary}66` }} />
      </div>
      <div style={{ position: "relative", width: D + 48, height: D + 48 }}>
        <svg
          width={D + 48}
          height={D + 48}
          style={{ position: "absolute", inset: 0, transform: `rotate(${ring}deg)` }}
        >
          <circle
            cx={(D + 48) / 2}
            cy={(D + 48) / 2}
            r={D / 2 + 18}
            fill="none"
            stroke={palette.accent}
            strokeWidth={4}
            strokeDasharray="26 18"
            opacity={0.9}
          />
        </svg>
        <div style={{ position: "absolute", left: 24, top: 24 }}>
          <Picture
            src={scene.image}
            palette={palette}
            variants={variants}
            mask="circle"
            box={{ width: D, height: D }}
            delay={6}
          />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <Caption
          text={scene.text}
          words={scene.words}
          audioSeconds={scene.audioSeconds}
          sceneFrames={sceneFrames}
          palette={palette}
          fontSize={fontSize}
          lineHeight={1.5}
          fontWeight={700}
          align="center"
          maxWidth={textW}
        />
        <div style={{ width: 200, height: 6, borderRadius: 3, background: palette.accent, opacity: 0.85 }} />
      </div>
    </div>
  );
};
/** 3 — stacked rows with staggered entrances + a tilted sticker picture */
const Stacked: React.FC<SceneProps & { variant: number }> = (props) => {
  const { scene, palette, variants, sceneFrames, sceneIndex } = props;
  const words = scene.text.split(/\s+/).filter(Boolean);
  const rowCount = scene.text.length <= 60 ? 1 : scene.text.length <= 150 ? 2 : 3;

  // split into balanced groups on word boundaries
  const rows: string[][] = Array.from({ length: rowCount }, () => []);
  const per = Math.ceil(words.length / rowCount);
  words.forEach((w, i) => {
    rows[Math.min(rowCount - 1, Math.floor(i / per))].push(w);
  });

  const hasImage = Boolean(scene.image) || true; // EmptyVisual still draws a sticker
  let fontSize = sizeForText(scene.text.length);
  const contentH = (s: number) => {
    let h = 0;
    rows.forEach((r, i) => {
      const w = i === 0 && hasImage ? 600 : 936;
      h += estimateTextHeight(r.join(" "), s, w - 76, 1.5) + 64 + (i ? 18 : 0);
    });
    return h;
  };
  while (fontSize > 32 && contentH(fontSize) + 96 > 1152) fontSize -= 2;

  const tilt = (sceneIndex % 2 === 0 ? 4 : -4) + (variants.crop > 50 ? 1.5 : -1.5);
  const totalChars = scene.text.length;
  const totalWordsCount = words.length;
  // running offsets so caption timing continues seamlessly across rows
  const offsets = rows.map((r, i) => {
    const before = rows.slice(0, i);
    return {
      wordOffset: before.reduce((a, r2) => a + r2.length, 0),
      beforeChars: before.reduce((a, r2) => a + r2.join(" ").length + 1, 0),
    };
  });

  return (
    <div style={{ ...stage, position: "absolute" }}>
      <Kicker label={scene.label} palette={palette} delay={4} />
      <div style={{ position: "absolute", right: 0, top: 0, zIndex: 3 }}>
        <div style={{ transform: `rotate(${tilt}deg)` }}>
          <Picture
            src={scene.image}
            palette={palette}
            variants={variants}
            mask={variants.motif === 1 ? "circle" : "rounded"}
            box={{ width: 296, height: 296 }}
            delay={4}
          />
        </div>
        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontSize: TYPE.micro.size - 3,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: palette.accent,
          }}
        >
          {String(sceneIndex + 1).padStart(2, "0")}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 96,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              width: i === 0 && hasImage ? 600 : 936,
              background: palette.light ? "#FFFFFF" : `${palette.surface}F0`,
              border: palette.light
                ? `1px solid ${palette.primary}22`
                : `1px solid #FFFFFF1A`,
              borderLeft: `10px solid ${i % 2 === 0 ? palette.accent : palette.primary}`,
              borderRadius: 22,
              padding: "26px 32px",
              boxShadow: palette.light
                ? "0 14px 36px rgba(10,27,51,0.10)"
                : "0 14px 36px rgba(0,0,0,0.30)",
            }}
          >
            <RowCaption
              text={r.join(" ")}
              scene={scene}
              sceneFrames={sceneFrames}
              palette={palette}
              fontSize={fontSize}
              wordOffset={offsets[i].wordOffset}
              beforeChars={offsets[i].beforeChars}
              totalWords={totalWordsCount}
              totalChars={totalChars}
            />
          </div>
        ))}
      </div>
      <IndexTag index={sceneIndex} palette={palette} style={{ position: "absolute", left: 2, bottom: 6 }} />
    </div>
  );
};

/** caption whose word timeline continues across the split rows */
const RowCaption: React.FC<{
  text: string;
  scene: Scene;
  sceneFrames: number;
  palette: Palette;
  fontSize: number;
  wordOffset: number;
  beforeChars: number;
  totalWords: number;
  totalChars: number;
}> = ({ text, scene, sceneFrames, palette, fontSize, wordOffset, beforeChars, totalWords, totalChars }) => (
  <Caption
    text={text}
    words={scene.words}
    audioSeconds={scene.audioSeconds}
    sceneFrames={sceneFrames}
    wordOffset={wordOffset}
    beforeChars={beforeChars}
    totalWords={totalWords}
    totalChars={totalChars}
    palette={palette}
    fontSize={fontSize}
    lineHeight={1.5}
    fontWeight={600}
  />
);


