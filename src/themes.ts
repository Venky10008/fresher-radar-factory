export type Theme = {
  isLight: boolean;
  bg1: string;
  bg2: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  onAccent: string;
  card: string;
  cardBorder: string;
  shadow: string;
};

// One look per category, so a viewer can tell the topic before reading anything.
export const THEMES: Record<string, Theme> = {
  // violet and cyan on deep indigo
  ai_tools: {
    isLight: false,
    bg1: "#0D0A2A",
    bg2: "#1D1458",
    ink: "#F4F2FF",
    muted: "#B2ACE0",
    accent: "#8B7CFF",
    accent2: "#22D3EE",
    onAccent: "#0D0A2A",
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(255,255,255,0.16)",
    shadow: "0 30px 80px rgba(5,3,30,0.55)",
  },
  // corporate blue and white (light theme)
  private_jobs: {
    isLight: true,
    bg1: "#F6FAFF",
    bg2: "#D7E6FF",
    ink: "#0A2A5E",
    muted: "#4D6794",
    accent: "#1F5FFF",
    accent2: "#00A3FF",
    onAccent: "#FFFFFF",
    card: "rgba(255,255,255,0.92)",
    cardBorder: "rgba(31,95,255,0.18)",
    shadow: "0 30px 70px rgba(20,60,140,0.22)",
  },
  // navy and saffron
  govt_jobs: {
    isLight: false,
    bg1: "#0A1F44",
    bg2: "#12376F",
    ink: "#FFFFFF",
    muted: "#B9C8E6",
    accent: "#FF9A1F",
    accent2: "#FFD166",
    onAccent: "#0A1F44",
    card: "rgba(255,255,255,0.09)",
    cardBorder: "rgba(255,255,255,0.18)",
    shadow: "0 30px 80px rgba(2,10,30,0.55)",
  },
  // emerald and lime
  internships: {
    isLight: false,
    bg1: "#04231F",
    bg2: "#0A4A42",
    ink: "#EDFFFA",
    muted: "#9DD3C8",
    accent: "#1ED6A8",
    accent2: "#B8F25C",
    onAccent: "#04231F",
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(255,255,255,0.16)",
    shadow: "0 30px 80px rgba(0,20,16,0.55)",
  },
  // burgundy and gold
  certificates: {
    isLight: false,
    bg1: "#2B0D1C",
    bg2: "#521832",
    ink: "#FFF6E6",
    muted: "#DDBBAA",
    accent: "#F4C25B",
    accent2: "#FF8F6B",
    onAccent: "#2B0D1C",
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(255,240,210,0.2)",
    shadow: "0 30px 80px rgba(20,3,12,0.55)",
  },
  // charcoal and coral
  career_boost: {
    isLight: false,
    bg1: "#17131F",
    bg2: "#2E2140",
    ink: "#FFF4F0",
    muted: "#CDB8CB",
    accent: "#FF6F61",
    accent2: "#FFB347",
    onAccent: "#17131F",
    card: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(255,255,255,0.16)",
    shadow: "0 30px 80px rgba(8,4,14,0.55)",
  },
};

export const getTheme = (category: string): Theme => THEMES[category] ?? THEMES.ai_tools;

export const withAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};
