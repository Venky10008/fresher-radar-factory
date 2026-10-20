export type SceneKind = "hook" | "line" | "students" | "cta";

/** One spoken word with its timing inside the scene audio, in milliseconds
 * from the start of the audio file. Provided by edge-tts word boundaries when
 * available; when missing the template reveals words proportionally. */
export type TimedWord = {
  /** milliseconds from the start of the scene audio */
  t: number;
  /** duration in milliseconds */
  d: number;
  /** the word as it was sent to the voice engine (may be the Telugu
   * phonetic spelling when the display word is English) */
  w: string;
};

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
  /** OPTIONAL: duration of the voice-over in seconds (used to duck the music) */
  audioSeconds?: number;
  /** OPTIONAL: word timings from the voice engine, milliseconds from the audio start */
  words?: TimedWord[];
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
  /** OPTIONAL: subtle transition sound (a short whoosh) inside /public, or null */
  sfx?: string | null;
  /** OPTIONAL: pop when the text card appears, inside /public, or null */
  sfxPop?: string | null;
  /** OPTIONAL: ding when the CTA buttons appear, inside /public, or null */
  sfxDing?: string | null;
};

