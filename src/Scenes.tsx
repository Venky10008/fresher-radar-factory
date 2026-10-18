import React, { useContext } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Icon, IconName } from "./Icons";
import {
  AREA_BOTTOM,
  AREA_TOP,
  Chip,
  FontContext,
  PictureCard,
  RadarMark,
  SIDE,
  TextCard,
  Words,
  WIDTH,
  estimatePanel,
  fontSizeFor,
  split,
} from "./Parts";
import { Theme, withAlpha } from "./themes";
import type { ReelProps, Scene } from "./types";

const CATEGORY_ICON: Record<string, IconName> = {
  ai_tools: "sparkle",
  govt_jobs: "bell",
  private_jobs: "briefcase",
  internships: "briefcase",
  certificates: "check",
  career_boost: "bolt",
};

const GROUP_OF: Record<string, string> = {
  ai_tools: "AI tools",
  internships: "Internships",
  certificates: "Certificates",
  govt_jobs: "Jobs",
  private_jobs: "Jobs",
  career_boost: "AI tools",
};

const sceneIcon = (scene: Scene, lineIndex: number, category: string): IconName => {
  if (scene.kind === "hook") return CATEGORY_ICON[category] ?? "sparkle";
  if (scene.kind === "students") return "cap";
  if (scene.kind === "cta") return "arrow";
  const order: IconName[] = ["bolt", "check", "bulb"];
  return order[lineIndex % order.length];
};

const useEnter = (frames: number) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const exit = interpolate(frame, [frames - 7, frames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { enter, exit };
};

const CtaScene: React.FC<{ scene: Scene; props: ReelProps; theme: Theme }> = ({ scene, props, theme }) => {
  const font = useContext(FontContext);
  const frame = useCurrentFrame();
  const { enter, exit } = useEnter(scene.frames);
  const active = GROUP_OF[props.category] ?? "AI tools";
  const groups = ["AI tools", "Internships", "Certificates", "Jobs"];
  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <div
        style={{
          position: "absolute",
          left: SIDE,
          width: WIDTH,
          top: AREA_TOP,
          height: AREA_BOTTOM - AREA_TOP,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          transform: `translateY(${(1 - enter) * 50}px)`,
          opacity: enter,
        }}
      >
        <div style={{ position: "relative", width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {[0, 1].map((i) => {
            const t = ((frame + i * 30) % 60) / 60;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 240 + t * 150,
                  height: 240 + t * 150,
                  borderRadius: "50%",
                  border: `3px solid ${withAlpha(theme.accent, (1 - t) * 0.5)}`,
                }}
              />
            );
          })}
          <RadarMark size={220} theme={theme} />
        </div>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 108, color: theme.ink, textAlign: "center", lineHeight: 1.15 }}>
          {props.brand}
        </div>
        <div style={{ fontFamily: font, fontWeight: 700, fontSize: 46, color: theme.muted, textAlign: "center" }}>
          {props.tagline}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
          {groups.map((g) => (
            <Chip
              key={g}
              label={g}
              size={32}
              bg={g === active ? theme.accent : withAlpha(theme.ink, 0.1)}
              color={g === active ? theme.onAccent : theme.ink}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 6 }}>
          <Chip label="Link in bio" size={42} bg={theme.accent} color={theme.onAccent} icon="arrow" iconColor={theme.onAccent} />
          <Chip label="Comment JOIN" size={42} bg={theme.accent2} color={theme.onAccent} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Words text={scene.text} frames={scene.frames} size={44} theme={theme} align="center" delay={12} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SceneView: React.FC<{
  scene: Scene;
  lineIndex: number;
  props: ReelProps;
  theme: Theme;
  variant: number;
}> = ({ scene, lineIndex, props, theme, variant }) => {
  const frame = useCurrentFrame();
  const { enter, exit } = useEnter(scene.frames);

  if (scene.kind === "cta") {
    return <CtaScene scene={scene} props={props} theme={theme} />;
  }

  const isHook = scene.kind === "hook";
  const icon = sceneIcon(scene, lineIndex, props.category);
  const size = fontSizeFor(scene.text, isHook ? 80 : scene.kind === "students" ? 64 : 66);
  const hasLabel = !isHook && !!scene.label;
  const panelH = estimatePanel(scene.text, size, hasLabel);

  const fullBleed = variant === 2 && !!scene.image;
  const v = fullBleed ? 2 : variant === 1 ? 1 : 0;
  const geo =
    v === 2
      ? { imgTop: AREA_TOP, panelTop: AREA_BOTTOM - panelH, imgH: AREA_BOTTOM - panelH - 34 - AREA_TOP }
      : split(v, panelH);

  const imgShift = (v === 1 ? 1 : -1) * (1 - enter) * 70;
  const panelShift = (v === 1 ? -1 : 1) * (1 - enter) * 70;
  const flip = (props.seed + lineIndex) % 2 === 0;

  const progress = Math.min(1, frame / Math.max(1, scene.frames));
  const bgScale = flip ? 1.16 - progress * 0.1 : 1.06 + progress * 0.1;

  const chipsTop = geo.imgTop + geo.imgH - 96;

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      {v === 2 && scene.image ? (
        <AbsoluteFill>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})` }}>
            <Img src={staticFile(scene.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, ${withAlpha(theme.bg1, 0.55)} 0%, ${withAlpha(theme.bg1, 0.15)} 38%, ${withAlpha(theme.bg1, 0.85)} 100%)`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${imgShift}px)`, opacity: enter }}>
          <PictureCard
            src={scene.image}
            theme={theme}
            icon={icon}
            seed={props.seed}
            frames={scene.frames}
            height={geo.imgH}
            top={geo.imgTop}
            flip={flip}
          />
        </div>
      )}

      {isHook ? (
        <div style={{ position: "absolute", inset: 0, opacity: enter }}>
          <div style={{ position: "absolute", left: SIDE + 30, top: geo.imgTop + 30 }}>
            <Chip label={props.badge} size={34} bg="#FFFFFF" color="#101828" icon={icon} iconColor={theme.accent} />
          </div>
          <div style={{ position: "absolute", left: SIDE + 30, right: SIDE + 30, top: chipsTop, display: "flex", justifyContent: "space-between" }}>
            {props.toolName ? (
              <Chip label={props.toolName} size={36} bg={withAlpha("#000000", 0.55)} color="#FFFFFF" />
            ) : (
              <span />
            )}
            {props.pricing && props.pricing !== "unknown" ? (
              <Chip
                label={props.pricing === "free" ? "Free" : props.pricing}
                size={36}
                bg={props.pricing === "free" ? "#2FBF71" : theme.accent2}
                color={props.pricing === "free" ? "#04210F" : theme.onAccent}
              />
            ) : (
              <span />
            )}
          </div>
        </div>
      ) : null}

      <div style={{ position: "absolute", inset: 0, transform: `translateY(${panelShift}px)`, opacity: enter }}>
        <TextCard
          theme={theme}
          label={hasLabel ? scene.label : ""}
          icon={icon}
          text={scene.text}
          frames={scene.frames}
          size={size}
          top={geo.panelTop}
          height={panelH}
          align={isHook ? "center" : "left"}
        />
      </div>
    </AbsoluteFill>
  );
};
