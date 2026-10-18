/**
 * Six category design systems. Each category has its own palette and mood so
 * the topic is recognisable before a single word is read.
 * Documented (with contrast ratios) in src-v2/README.md.
 *
 * Fields:
 *   bg / bgAlt    base background + gradient partner
 *   surface       cards and panels
 *   surface2      raised rows inside cards
 *   primary       structural colour (rails, tracks, chips)
 *   accent        highlight colour (current word, fills, progress)
 *   text          main text
 *   textMuted     secondary text (labels, counters)
 *   onAccent      text colour placed on accent/primary fills
 *   light         true when the background is light (text colours flip)
 */
export type Palette = {
  id: string;
  label: string;
  mood: string;
  bg: string;
  bgAlt: string;
  surface: string;
  surface2: string;
  primary: string;
  accent: string;
  text: string;
  textMuted: string;
  onAccent: string;
  light: boolean;
};

export const PALETTES: Record<string, Palette> = {
  ai_tools: {
    id: "ai_tools",
    label: "AI tools",
    mood: "Deep violet night with electric cyan — futuristic, product-demo energy",
    bg: "#0B0620",
    bgAlt: "#1B1049",
    surface: "#171039",
    surface2: "#231856",
    primary: "#8B5CF6",
    accent: "#22D3EE",
    text: "#F3F0FE",
    textMuted: "#B9AFEA",
    onAccent: "#05121E",
    light: false,
  },
  govt_jobs: {
    id: "govt_jobs",
    label: "Govt jobs",
    mood: "Official navy with saffron — dependable, notification-board serious",
    bg: "#071A3A",
    bgAlt: "#103066",
    surface: "#102A57",
    surface2: "#1A3972",
    primary: "#2E6BE6",
    accent: "#F59E0B",
    text: "#F8FAFF",
    textMuted: "#B3C6EA",
    onAccent: "#2A1502",
    light: false,
  },
  private_jobs: {
    id: "private_jobs",
    label: "Private jobs",
    mood: "Clean blue and white corporate — crisp, daylight, hiring-desk feel",
    bg: "#EDF3FF",
    bgAlt: "#D9E7FF",
    surface: "#FFFFFF",
    surface2: "#E4EDFF",
    primary: "#0B57D0",
    accent: "#0A46B4",
    text: "#0A1B33",
    textMuted: "#41546F",
    onAccent: "#FFFFFF",
    light: true,
  },
  internships: {
    id: "internships",
    label: "Internships",
    mood: "Emerald and lime — growth, first-chance optimism",
    bg: "#04231A",
    bgAlt: "#0A4030",
    surface: "#0A3327",
    surface2: "#104635",
    primary: "#12B981",
    accent: "#B5F13D",
    text: "#EDFDF5",
    textMuted: "#A9DBC6",
    onAccent: "#052E1F",
    light: false,
  },
  certificates: {
    id: "certificates",
    label: "Certificates",
    mood: "Burgundy and gold — diploma gravitas, premium course feel",
    bg: "#26070F",
    bgAlt: "#48111F",
    surface: "#360C1A",
    surface2: "#4C1528",
    primary: "#C2183F",
    accent: "#F2C230",
    text: "#FFF3F5",
    textMuted: "#E7AEBB",
    onAccent: "#26070F",
    light: false,
  },
  career_boost: {
    id: "career_boost",
    label: "Career boost",
    mood: "Coral on warm charcoal — friendly coaching, momentum",
    bg: "#1C0B08",
    bgAlt: "#3A170F",
    surface: "#2B120C",
    surface2: "#3E1B12",
    primary: "#FF6A3D",
    accent: "#FDBA74",
    text: "#FFF5EE",
    textMuted: "#EEC3AC",
    onAccent: "#26110A",
    light: false,
  },
};

export const getPalette = (category: string): Palette =>
  PALETTES[category] ?? PALETTES.ai_tools;

export const CATEGORY_IDS = Object.keys(PALETTES);
