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
  toolName: "NotebookLM",
  pricing: "free",
  seed: 7,
  fontMode: "web",
  music: null,
  scenes: [
    { kind: "hook", text: "మీ notes ని podcast లా వినాలా? NotebookLM ట్రై చేయండి!", label: "", audio: null, image: null, frames: 120 },
    { kind: "line", text: "Google NotebookLM లో PDFs upload చేస్తే summary, quiz, audio overview అన్నీ తయారు చేస్తుంది.", label: "What it does", audio: null, image: null, frames: 170 },
    { kind: "students", text: "Semester exams ముందు long PDFs ని fast గా revise చేయడానికి చాలా ఉపయోగం.", label: "For B.Tech students", audio: null, image: null, frames: 150 },
    { kind: "cta", text: "రోజూ ఇలాంటి AI tools updates కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.", label: "", audio: null, image: null, frames: 170 },
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
