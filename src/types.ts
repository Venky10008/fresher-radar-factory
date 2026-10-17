export type SceneKind = "hook" | "line" | "students" | "cta";

export type Scene = {
  kind: SceneKind;
  /** Text shown on screen and spoken in the voice-over */
  text: string;
  /** Path inside /public, for example "audio/scene_0.mp3". null = no voice */
  audio: string | null;
  /** How long this scene lasts, in frames (30 fps) */
  frames: number;
};

export type ReelProps = {
  brand: string;
  categoryLabel: string;
  toolName: string;
  pricing: string;
  scenes: Scene[];
};
