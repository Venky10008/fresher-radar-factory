export type SceneKind = "hook" | "line" | "students" | "cta";

export type Scene = {
  kind: SceneKind;
  /** Text shown on screen and spoken in the voice-over */
  text: string;
  /** Small label above the text, for example "What it does" */
  label: string;
  /** Path inside /public for the voice-over, or null for silent */
  audio: string | null;
  /** Path inside /public for the scene picture, or null (a motion graphic is drawn instead) */
  image: string | null;
  /** Length of this scene in frames (30 fps) */
  frames: number;
};

export type ReelProps = {
  brand: string;
  /** ai_tools, govt_jobs, private_jobs, internships, certificates, career_boost */
  category: string;
  categoryLabel: string;
  badge: string;
  tagline: string;
  toolName: string;
  pricing: string;
  /** Number made from the post text. It picks layout, pattern and motion so every video looks different */
  seed: number;
  /** "web" loads the Telugu font from Google Fonts. "local" uses a font installed on the computer (testing only) */
  fontMode: "web" | "local";
  /** Background music file inside /public, or null */
  music: string | null;
  scenes: Scene[];
};
