import React from "react";
import { Composition } from "remotion";
import { RadarReel } from "./RadarReel";
import type { ReelProps } from "./types";

export const FPS = 30;

const defaultProps: ReelProps = {
  brand: "Fresher Radar",
  category: "ai_tools",
  categoryLabel: "AI tools",
  badge: "New AI tool",
  tagline: "Daily AI tools, internships, jobs",
  toolName: "",
  pricing: "free",
  seed: 7,
  fontMode: "web",
  music: null,
  scenes: [
    { kind: "hook", text: "ఎగ్జామ్స్ టైమ్‌లో నోట్స్ చదవడం కష్టంగా ఉందా?", label: "", audio: null, image: null, frames: 120 },
    { kind: "line", text: "ఒక టూల్ మీ నోట్స్‌ను సింపుల్‌గా వివరిస్తుంది.", label: "What it does", audio: null, image: null, frames: 150 },
    { kind: "line", text: "మీరు ప్రశ్నలు అడగొచ్చు, క్విజ్‌లతో ప్రాక్టీస్ చేయొచ్చు.", label: "How it works", audio: null, image: null, frames: 150 },
    { kind: "students", text: "సెమిస్టర్ ఎగ్జామ్స్ ముందు రివిజన్‌కి ఇది చాలా ఉపయోగం.", label: "For B.Tech students", audio: null, image: null, frames: 150 },
    { kind: "cta", text: "ఆ టూల్ కావాలంటే బయోలో ఉన్న లింక్ నుంచి మన గ్రూప్‌లో జాయిన్ అవ్వండి. ప్రతిరోజూ కొత్త టూల్స్ అప్‌డేట్స్ పోస్ట్ చేస్తాం.", label: "", audio: null, image: null, frames: 170 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RadarReel"
      component={RadarReel}
      durationInFrames={610}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => {
        const total = props.scenes.reduce((sum, s) => sum + s.frames, 0);
        return { durationInFrames: Math.max(FPS * 5, total) };
      }}
    />
  );
};
