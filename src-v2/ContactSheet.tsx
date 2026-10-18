import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import type { ReelProps, SceneKind } from "../src/types";
import { RadarReelV2 } from "./RadarReelV2";
import { CATEGORY_IDS, getPalette } from "./design/palettes";

/**
 * Contact sheet: every category x (short, medium, long text) x (with/without
 * pictures), plus a row of hooks and a row of end cards.
 *
 * 48 cells, 6 columns. Every cell is a REAL RadarReelV2 render (scaled down),
 * frozen at a frame where the caption is fully revealed — so this image is
 * direct evidence of typography, layout and overflow behaviour.
 */

const CELL_W = 340;
const CELL_H = Math.round((CELL_W * 1920) / 1080); // 604
const COLS = 6;
const PAD = 44;
const GAP_X = 24;
const GAP_Y = 34;
const TITLE_H = 34;
const HEADER_H = 92;

export const SHEET_W = PAD * 2 + COLS * CELL_W + (COLS - 1) * GAP_X;
export const SHEET_ROWS = 8;
export const SHEET_H =
  PAD * 2 + HEADER_H + SHEET_ROWS * (CELL_H + TITLE_H) + (SHEET_ROWS - 1) * GAP_Y;

const CAT_INFO: Record<string, { badge: string; tagline: string }> = {
  ai_tools: { badge: "New AI tool", tagline: "Daily AI tools, internships, jobs" },
  govt_jobs: { badge: "Govt job alert", tagline: "Notifications before everyone else" },
  private_jobs: { badge: "Hiring now", tagline: "Jobs and updates for freshers" },
  internships: { badge: "Internship alert", tagline: "Internships with certificates" },
  certificates: { badge: "Free course", tagline: "Free courses and certificates" },
  career_boost: { badge: "Career tip", tagline: "Resume, interviews, roadmaps" },
};

const TEXTS = {
  short: "PDFs ని podcast లా మార్చండి!",
  medium:
    "Google NotebookLM లో PDFs upload చేస్తే summary, quiz, audio overview అన్నీ తయారు చేస్తుంది. Telugu audio overviews కూడా support చేస్తుంది.",
  long:
    "Semester exams కి ముందు long PDFs, notes, previous papers అన్నీ ఒక్కచోట చూసి revise చేయడం కష్టం. NotebookLM లో అన్నీ upload చేస్తే ఒక్క summary, flashcards, quiz మరియు audio overview వస్తాయి. రోజుకు అరగంట చాలు, అంతే కాదు weak topics ఏంటో కూడా చూపిస్తుంది. ఫ్రెషర్స్ కి ఇది చాలా ఉపయోగం.",
  hook: "మీ notes ని podcast లా వినాలా? ఇదిగోండి కొత్త tool!",
  cta: "రోజూ ఇలాంటి updates కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
};

const LENGTH_LABEL: Record<string, string> = {
  short: "short",
  medium: "medium · 4 lines",
  long: "long · 8 lines",
};

type Cell = {
  title: string;
  props: ReelProps;
  /** frame to freeze at (caption fully revealed) */
  frame: number;
};

const makeProps = (
  category: string,
  kind: SceneKind,
  text: string,
  label: string,
  image: string | null,
  seed: number
): ReelProps => {
  const palette = getPalette(category);
  const info = CAT_INFO[category];
  return {
    brand: "Fresher Radar",
    category,
    categoryLabel: palette.label,
    badge: info.badge,
    tagline: info.tagline,
    toolName: "",
    pricing: "",
    seed,
    fontMode: "web",
    music: null,
    sfx: null,
    scenes: [{ kind, text, label, audio: null, image, frames: 300 }],
  };
};
const buildCells = (): Cell[] => {
  const cells: Cell[] = [];
  const lengths: Array<keyof typeof TEXTS> = ["short", "medium", "long"];
  // row 0: hooks (alternating pictures / graphics)
  CATEGORY_IDS.forEach((cat, i) => {
    cells.push({
      title: `${getPalette(cat).label} · hook ${i % 2 === 0 ? "· photo" : "· graphic"}`,
      props: makeProps(
        cat,
        "hook",
        TEXTS.hook,
        "",
        i % 2 === 0 ? `images/sheet_${cat}_0.jpg` : null,
        1000 + i
      ),
      frame: 150,
    });
  });
  // row 1: end cards
  CATEGORY_IDS.forEach((cat, i) => {
    cells.push({
      title: `${getPalette(cat).label} · end card`,
      props: makeProps(cat, "cta", TEXTS.cta, "", null, 2000 + i),
      frame: 210,
    });
  });
  // rows 2-7: each category x length x picture on/off
  CATEGORY_IDS.forEach((cat, ci) => {
    lengths.forEach((len, li) => {
      [true, false].forEach((withPic, pi) => {
        const label =
          len === "short" ? "" : len === "medium" ? "What it does" : "For B.Tech students";
        cells.push({
          title: `${getPalette(cat).label} · ${LENGTH_LABEL[len]} · ${withPic ? "photo" : "graphic"}`,
          props: makeProps(
            cat,
            "line",
            TEXTS[len],
            label,
            withPic ? `images/sheet_${cat}_${pi}.jpg` : null,
            3000 + ci * 100 + li * 10 + pi
          ),
          frame: 240,
        });
      });
    });
  });
  return cells;
};

const CELLS = buildCells();

export const ContactSheet: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0B0E14", padding: PAD }}>
      <div
        style={{
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          gap: 26,
          color: "#F2F4F8",
          fontFamily: '"Noto Sans", system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "0.04em" }}>
          Fresher Radar · RadarReelV2 contact sheet
        </div>
        <div style={{ fontSize: 23, color: "#93A0B4" }}>
          6 categories × (short · medium · long) × (photo · graphic) + hooks + end cards —
          frozen at fully-revealed caption frames
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
          gap: `${GAP_Y}px ${GAP_X}px`,
        }}
      >
        {CELLS.map((cell, i) => (
          <div key={i}>
            <div
              style={{
                height: TITLE_H,
                color: "#B9C4D4",
                fontSize: 19,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                fontFamily: '"Noto Sans", system-ui, sans-serif',
              }}
            >
              {cell.title}
            </div>
            <div
              style={{
                width: CELL_W,
                height: CELL_H,
                overflow: "hidden",
                position: "relative",
                borderRadius: 14,
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 1080,
                  height: 1920,
                  transform: `scale(${CELL_W / 1080})`,
                  transformOrigin: "top left",
                }}
              >
                <Sequence from={-cell.frame} layout="none">
                  <RadarReelV2 {...cell.props} />
                </Sequence>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

