import React from "react";
import { useCurrentFrame } from "remotion";
import { LAYOUT, TYPE, estimateTextHeight } from "../design/tokens";
import { Caption } from "../components/Caption";
import { Enter } from "../components/ui";
import type { SceneProps } from "./HookScene";
import { stage } from "./HookScene";

/** --- small brand-consistent icons (no icon font, no network) --- */
const LinkIcon: React.FC<{ c: string }> = ({ c }) => (
  <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
    <path
      d="M10 14a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.4 5.5"
      stroke={c}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M14 10a5 5 0 0 0-7.07 0L4.1 12.83a5 5 0 0 0 7.07 7.07l1.4-1.4"
      stroke={c}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const CommentIcon: React.FC<{ c: string }> = ({ c }) => (
  <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-4.2 3.4A.5.5 0 0 1 4 19V6Z"
      stroke={c}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path d="M8.5 8.5h7M8.5 12h4.5" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const ChatIcon: React.FC<{ c: string }> = ({ c }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3.5c4.7 0 8.5 3.2 8.5 7.2S16.7 18 12 18c-.9 0-1.8-.1-2.6-.3L5 20l1.2-3.3C4.5 15.4 3.5 13.6 3.5 11.7c0-4 3.8-7.2 8.5-7.2Z"
      stroke={c}
      strokeWidth="2.1"
      strokeLinejoin="round"
    />
  </svg>
);

const SendIcon: React.FC<{ c: string }> = ({ c }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 4 3 10.5l6 2.3M21 4l-3 15-6.8-5.9M21 4 9 12.8m0 0v5.2l3.4-3.4"
      stroke={c}
      strokeWidth="2.1"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * CTA / END CARD — the video's job in one frame:
 * "Link in bio", "Comment JOIN", and the two community groups, on top of the
 * spoken closing line. Everything inside the safe stage.
 */
export const CtaScene: React.FC<SceneProps> = (props) => {
  const { scene, palette, sceneFrames, tagline, badge } = props;
  const frame = useCurrentFrame();
  const textW = 880;
  let fontSize = 52;
  const lockupH = 120;
  const cardsH = 190;
  const groupsH = 108;
  const tailH = 44;
  const reserve = lockupH + cardsH + groupsH + tailH + 4 * 34;
  while (fontSize > 34 && estimateTextHeight(scene.text, fontSize, textW, 1.5) > 1152 - reserve)
    fontSize -= 2;

  const pulse = 1 + Math.sin(Math.max(0, frame - 40) / 46) * 0.012;

  return (
    <div
      style={{
        ...stage,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
      }}
    >
      {/* brand lockup */}
      <Enter delay={2} from="scale" distance={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="84" height="84" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="none" stroke={palette.accent} strokeWidth="3" />
            <path d="M22 22 L22 6 A16 16 0 0 1 35.8 14 Z" fill={palette.accent} opacity="0.35" />
            <circle cx="22" cy="22" r="4" fill={palette.accent} />
            <circle cx="32" cy="13" r="3" fill={palette.accent} />
          </svg>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: palette.text,
            }}
          >
            {badge ? badge.toUpperCase() : tagline.toUpperCase()}
          </div>
        </div>
      </Enter>

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
      {/* the two asks */}
      <div style={{ display: "flex", gap: 48 }}>
        <Enter delay={10} from="up">
          <div
            style={{
              width: 430,
              background: palette.accent,
              color: palette.onAccent,
              borderRadius: 26,
              padding: "30px 34px",
              display: "flex",
              alignItems: "center",
              gap: 22,
              boxShadow: "0 24px 60px rgba(0,0,0,0.30)",
              transform: `scale(${pulse})`,
            }}
          >
            <LinkIcon c={palette.onAccent} />
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.25 }}>Link in bio</div>
              <div style={{ fontSize: TYPE.micro.size, fontWeight: 600, opacity: 0.85 }}>
                బయో లో లింక్ ఉంది
              </div>
            </div>
          </div>
        </Enter>
        <Enter delay={16} from="up">
          <div
            style={{
              width: 430,
              background: palette.light ? "#FFFFFF" : palette.surface,
              border: `3px solid ${palette.accent}`,
              color: palette.text,
              borderRadius: 26,
              padding: "30px 34px",
              display: "flex",
              alignItems: "center",
              gap: 22,
              boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
              transform: `scale(${pulse})`,
            }}
          >
            <CommentIcon c={palette.accent} />
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.25 }}>
                Comment <span style={{ color: palette.accent }}>JOIN</span>
              </div>
              <div style={{ fontSize: TYPE.micro.size, fontWeight: 600, color: palette.textMuted }}>
                కామెంట్ లో JOIN అనండి
              </div>
            </div>
          </div>
        </Enter>
      </div>

      {/* community groups */}
      <Enter delay={24} from="up">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontSize: TYPE.kicker.size - 4,
              fontWeight: 700,
              letterSpacing: TYPE.kicker.tracking,
              textTransform: "uppercase",
              color: palette.textMuted,
            }}
          >
            Community groups
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: palette.light ? "#FFFFFF" : `${palette.surface2}`,
                border: `2px solid ${palette.primary}59`,
                borderRadius: 999,
                padding: "16px 32px",
                fontSize: 30,
                fontWeight: 700,
                color: palette.text,
              }}
            >
              <ChatIcon c={palette.primary} />
              WhatsApp Group
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: palette.light ? "#FFFFFF" : `${palette.surface2}`,
                border: `2px solid ${palette.accent}59`,
                borderRadius: 999,
                padding: "16px 32px",
                fontSize: 30,
                fontWeight: 700,
                color: palette.text,
              }}
            >
              <SendIcon c={palette.accent} />
              Telegram Channel
            </div>
          </div>
        </div>
      </Enter>

      <Enter delay={32} from="up">
        <div style={{ fontSize: TYPE.micro.size + 2, fontWeight: 600, color: palette.textMuted }}>
          {tagline}
        </div>
      </Enter>
    </div>
  );
};

