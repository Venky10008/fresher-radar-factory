import React from "react";
import { Composition } from "remotion";
import { RadarReel } from "./RadarReel";
import type { ReelProps } from "./types";

export const FPS = 30;

const defaultProps: ReelProps = {
  brand: "Fresher Radar",
  categoryLabel: "AI tools",
  toolName: "Sample Tool",
  pricing: "free",
  scenes: [
    { kind: "hook", text: "ఈ free AI tool తో మీ resume 2 నిమిషాల్లో రెడీ!", audio: null, frames: 120 },
    { kind: "line", text: "కొత్త AI tool వచ్చింది. మీ details ఇస్తే resume ని automatic గా తయారు చేస్తుంది.", audio: null, frames: 150 },
    { kind: "students", text: "B.Tech students placements కి quick గా resume రెడీ చేసుకోవచ్చు.", audio: null, frames: 130 },
    { kind: "cta", text: "రోజూ ఇలాంటి updates కోసం bio లో ఉన్న Fresher Radar group లో join అవ్వండి.", audio: null, frames: 150 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RadarReel"
      component={RadarReel}
      durationInFrames={550}
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
