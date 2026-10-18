import React from "react";
import { Composition } from "remotion";
import type { ReelProps } from "../src/types";
import { RadarReelV2 } from "./RadarReelV2";
import { ContactSheet, SHEET_H, SHEET_W } from "./ContactSheet";

export const FPS = 30;

/** default props so the studio can open RadarReelV2 without a props file */
const defaultProps: ReelProps = {
  brand: "Fresher Radar",
  category: "ai_tools",
  categoryLabel: "AI tools",
  badge: "New AI tool",
  tagline: "Daily AI tools, internships, jobs",
  toolName: "NotebookLM",
  pricing: "free",
  seed: 7,
  fontMode: "web",
  music: null,
  sfx: null,
  scenes: [
    {
      kind: "hook",
      text: "మీ notes ని podcast లా వినాలా? NotebookLM ట్రై చేయండి!",
      label: "",
      audio: null,
      image: null,
      frames: 120,
    },
    {
      kind: "line",
      text: "Google NotebookLM లో PDFs upload చేస్తే summary, quiz, audio overview అన్నీ తయారు చేస్తుంది.",
      label: "What it does",
      audio: null,
      image: null,
      frames: 170,
    },
    {
      kind: "students",
      text: "Semester exams ముందు long PDFs ని fast గా revise చేయడానికి చాలా ఉపయోగం.",
      label: "For B.Tech students",
      audio: null,
      image: null,
      frames: 150,
    },
    {
      kind: "cta",
      text: "రోజూ ఇలాంటి AI tools updates కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
      label: "",
      audio: null,
      image: null,
      frames: 170,
    },
  ],
};

export const RemotionRootV2: React.FC = () => {
  return (
    <>
      <Composition
        id="RadarReelV2"
        component={RadarReelV2}
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
      <Composition
        id="ContactSheet"
        component={ContactSheet}
        durationInFrames={1}
        fps={FPS}
        width={SHEET_W}
        height={SHEET_H}
        defaultProps={{}}
      />
    </>
  );
};
