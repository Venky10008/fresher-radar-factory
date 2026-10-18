/**
 * Telugu typography.
 *
 * web  -> Noto Sans Telugu + Noto Sans loaded from Google Fonts
 *        (the only network access allowed during render)
 * local -> font stack of fonts installed on the machine (testing only)
 *
 * The family list puts Latin first so English words inside Telugu sentences
 * render in Noto Sans, and Telugu glyphs fall through to Noto Sans Telugu.
 * Loading is wrapped in delayRender so the first rendered frame is never
 * drawn with a fallback font.
 */
import { continueRender, delayRender } from "remotion";
import { useEffect, useState } from "react";

const LOCAL_STACK =
  '"Noto Sans Telugu", "Noto Sans", "Nirmala UI", "Gautami", system-ui, sans-serif';

type LoadedFont = { family: string; pending: Promise<unknown> };
let cached: LoadedFont | null = null;

const loadWebFonts = (): LoadedFont => {
  if (cached) return cached;
  const telugu = require("@remotion/google-fonts/NotoSansTelugu") as {
    loadFont: (
      s: "normal",
      o?: object
    ) => { fontFamily: string; waitUntilDone: () => Promise<undefined> };
  };
  const latin = require("@remotion/google-fonts/NotoSans") as {
    loadFont: (
      s: "normal",
      o?: object
    ) => { fontFamily: string; waitUntilDone: () => Promise<undefined> };
  };
  const weights = ["400", "500", "600", "700", "800"];
  const t = telugu.loadFont("normal", { weights, subsets: ["telugu", "latin", "latin-ext"] });
  const l = latin.loadFont("normal", { weights, subsets: ["latin", "latin-ext"] });
  cached = {
    family: `"${l.fontFamily}", "${t.fontFamily}", system-ui, sans-serif`,
    pending: Promise.all([t.waitUntilDone(), l.waitUntilDone()]),
  };
  return cached;
};

/** returns the CSS font-family stack and blocks rendering until fonts are ready */
export const useFonts = (fontMode: "web" | "local"): string => {
  const [handle] = useState(() => delayRender("load fonts"));
  const [family, setFamily] = useState<string>(fontMode === "local" ? LOCAL_STACK : "");

  useEffect(() => {
    if (fontMode === "local") {
      setFamily(LOCAL_STACK);
      continueRender(handle);
      return;
    }
    const { family: css, pending } = loadWebFonts();
    let cancelled = false;
    pending
      .then(() => {
        if (cancelled) return;
        setFamily(css);
        continueRender(handle);
      })
      .catch(() => {
        if (cancelled) return;
        setFamily(LOCAL_STACK);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [fontMode, handle]);

  return family;
};
