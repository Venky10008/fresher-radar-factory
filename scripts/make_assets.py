"""
Prepares everything Remotion needs for one reel:
  1. Telugu voice-over for every scene (edge-tts first, Google TTS as backup, silent if both fail)
     - Optional job fields voice_hook_te / voice_summary_te / voice_students_te / voice_cta_te:
       the same sentences in PURE Telugu script (English words spelled phonetically).
       When present the voice reads these; the screen still shows the normal text.
       When missing, normalize_te() + the ~90-word dictionary is used as before.
      - Each scene is ONE edge-tts call for the whole text (no phrase splitting,
        no inserted silence, no atempo). Word boundaries (boundary="WordBoundary")
        become scene.words in props.json.
      - Voice settings come from VOICE_PROFILES (env VOICE_PRESET=single|mix,
        default single): a voice/rate/pitch per scene kind (hook/features/cta).
      - Every clip is trimmed and loudness-normalized (loudnorm -16 LUFS /
        -1.5 dBTP).
  2. One picture per scene from the image prompts (Cloudflare FLUX, then Pollinations; a motion graphic is drawn if both fail)
  3. A soft background music pad (made with ffmpeg, no download needed)
  4. Three sound effects (whoosh, pop, ding; ffmpeg) — disable with job "sfx": false
  5. public/props.json (scenes also carry optional audioSeconds + words)
The video is always made, even if voice or pictures fail.
"""
import asyncio
import base64
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

FPS = 30
# Gap targets (FIX 5): short, natural-feeling pauses. Keep atempo = 1.0 always.
PHRASE_GAP = 0.25   # pause between phrases inside one scene (was 0.42)
SCENE_PAD = 0.25    # trailing silence pad per scene (was 0.6; CTA keeps 1.4 frames pad)
# Telugu text goes to stdout; make sure any console (Windows cp1252 included)
# can print it instead of crashing the run.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
except Exception:  # noqa: BLE001
    pass
VOICE_DEFAULT = "te-IN-ShrutiNeural"  # other Telugu voice: te-IN-MohanNeural
RATE_DEFAULT = "+0%"  # normal speed keeps the Telugu speech clear
FONT_MODE = os.environ.get("FONT_MODE", "web")
TTS_ORDER = [e.strip() for e in os.environ.get("TTS_ORDER", "edge,gtts").split(",") if e.strip()]

CATEGORY = {
    "ai_tools": {
        "label": "AI tools",
        "badge": "New AI tool",
        "tagline": "Daily AI tools, internships, jobs",
        "scene_labels": ["What it does", "How it works", "Good to know"],
        "students": "For B.Tech students",
        "style": "purple and cyan glow",
        "images": [
            "a sleek laptop and smartphone showing a modern app interface, glowing screens",
            "a student studying at a desk with a laptop and notebooks, warm light",
            "abstract connected nodes and sparkles representing artificial intelligence",
        ],
        "cta": "ఆ టూల్ కావాలంటే బయోలో ఉన్న లింక్ నుంచి మన గ్రూప్‌లో జాయిన్ అవ్వండి. ప్రతిరోజూ కొత్త టూల్స్ అప్‌డేట్స్ పోస్ట్ చేస్తాం.",
        "root": 110.0,
    },
    "private_jobs": {
        "label": "Private jobs",
        "badge": "Hiring now",
        "tagline": "Jobs and updates for freshers",
        "scene_labels": ["The role", "Eligibility", "How to apply"],
        "students": "Who can apply",
        "style": "blue and white corporate",
        "images": [
            "a modern glass office building with blue sky",
            "young graduates in smart casual clothes smiling in a bright office",
            "a resume, laptop and coffee on a clean desk",
        ],
        "cta": "ఈ జాబ్ వివరాలు కావాలంటే బయోలో ఉన్న లింక్ నుంచి మన గ్రూప్‌లో జాయిన్ అవ్వండి. ప్రతిరోజూ కొత్త జాబ్ అప్‌డేట్స్ పోస్ట్ చేస్తాం.",
        "root": 130.81,
    },
    "govt_jobs": {
        "label": "Govt jobs",
        "badge": "Govt job alert",
        "tagline": "Notifications before everyone else",
        "scene_labels": ["Vacancy details", "Eligibility", "How to apply"],
        "students": "Who should apply",
        "style": "navy blue and saffron",
        "images": [
            "a large government building with steps and flags, dramatic sky",
            "students preparing for an exam with books in a library",
            "an official application form and pen on a wooden desk",
        ],
        "cta": "ఈ నోటిఫికేషన్ వివరాలు కావాలంటే బయోలో ఉన్న లింక్ నుంచి మన గ్రూప్‌లో జాయిన్ అవ్వండి. ప్రతిరోజూ కొత్త నోటిఫికేషన్స్ పోస్ట్ చేస్తాం.",
        "root": 146.83,
    },
    "internships": {
        "label": "Internships",
        "badge": "Internship alert",
        "tagline": "Internships with certificates",
        "scene_labels": ["The program", "Eligibility", "How to apply"],
        "students": "Who can join",
        "style": "emerald green and lime",
        "images": [
            "young interns collaborating around a laptop in a modern startup space",
            "a student holding a laptop and a certificate, happy",
            "a notebook with a career roadmap and sticky notes",
        ],
        "cta": "ఈ ఇంటర్న్‌షిప్ వివరాలు కావాలంటే బయోలో ఉన్న లింక్ నుంచి మన గ్రూప్‌లో జాయిన్ అవ్వండి. ప్రతిరోజూ కొత్త ఇంటర్న్‌షిప్ అప్‌డేట్స్ పోస్ట్ చేస్తాం.",
        "root": 164.81,
    },
    "certificates": {
        "label": "Certificates",
        "badge": "Free course",
        "tagline": "Free courses and certificates",
        "scene_labels": ["The course", "What you get", "How to join"],
        "students": "Who should join",
        "style": "burgundy and gold",
        "images": [
            "a golden certificate with a ribbon on a dark elegant background",
            "a student learning online on a laptop with headphones",
            "a graduation cap and books on a desk",
        ],
        "cta": "ఈ కోర్స్ వివరాలు కావాలంటే బయోలో ఉన్న లింక్ నుంచి మన గ్రూప్‌లో జాయిన్ అవ్వండి. ప్రతిరోజూ కొత్త కోర్స్ అప్‌డేట్స్ పోస్ట్ చేస్తాం.",
        "root": 87.31,
    },
    "career_boost": {
        "label": "Career boost",
        "badge": "Career tip",
        "tagline": "Resume, interviews, roadmaps",
        "scene_labels": ["The tip", "Why it works", "Try this"],
        "students": "For freshers",
        "style": "coral and warm orange",
        "images": [
            "a resume being reviewed on a desk with a pen, warm light",
            "two people in a friendly interview conversation",
            "a staircase made of books leading up toward a bright light",
        ],
        "cta": "ఈ కెరీర్ టిప్ వివరాలు కావాలంటే బయోలో ఉన్న లింక్ నుంచి మన గ్రూప్‌లో జాయిన్ అవ్వండి. ప్రతిరోజూ కొత్త కెరీర్ టిప్స్ పోస్ట్ చేస్తాం.",
        "root": 98.0,
    },
}


def log(msg):
    print(msg, flush=True)


def load_job():
    raw = os.environ.get("JOB_JSON", "").strip()
    if raw:
        return json.loads(raw)
    with open("job.json", "r", encoding="utf-8") as f:
        return json.load(f)


def split_sentences(text):
    text = (text or "").strip()
    if not text:
        return []
    parts = [p.strip() for p in re.split(r"(?<=[.!?।])\s+|\n+", text) if p.strip()]
    if len(parts) > 3:
        parts = parts[:2] + [" ".join(parts[2:])]
    return parts


def audio_seconds(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(out.stdout.strip())


# English words written inside Telugu text are read badly by the Telugu voice
# ("notes" comes out as "no..ts"), so common ones are replaced with a Telugu
# spelling before the voice reads them. On-screen text is NOT changed by this.
TELUGU_WORDS = {
    "notebooklm": "నోట్‌బుక్ ఎల్ఎమ్",
    "notebook": "నోట్‌బుక్",
    "notes": "నోట్స్",
    "note": "నోట్",
    "podcasts": "పాడ్‌కాస్ట్‌లు",
    "podcast": "పాడ్‌కాస్ట్",
    "summary": "సమరీ",
    "quiz": "క్విజ్",
    "quizzes": "క్విజెస్",
    "audio": "ఆడియో",
    "overviews": "ఓవర్‌వ్యూస్",
    "overview": "ఓవర్‌వ్యూ",
    "pdfs": "పీడీఎఫ్‌స్",
    "pdf": "పీడీఎఫ్",
    "ai": "ఏఐ",
    "api": "ఏపీఐ",
    "apps": "యాప్స్",
    "app": "యాప్",
    "exams": "ఎగ్జామ్స్",
    "exam": "ఎగ్జామ్",
    "revisions": "రివిజన్లు",
    "revision": "రివిజన్",
    "revise": "రివైజ్",
    "fast": "ఫాస్ట్",
    "long": "లాంగ్",
    "jobs": "జాబ్స్",
    "job": "జాబ్",
    "free": "ఫ్రీ",
    "groups": "గ్రూప్‌లు",
    "group": "గ్రూప్",
    "join": "జాయిన్",
    "updates": "అప్‌డేట్స్",
    "update": "అప్‌డేట్",
    "bio": "బయో",
    "tools": "టూల్స్",
    "tool": "టూల్",
    "semester": "సెమిస్టర్",
    "semesters": "సెమిస్టర్లు",
    "google": "గూగుల్",
    "uploads": "అప్‌లోడ్స్",
    "upload": "అప్‌లోడ్",
    "students": "స్టూడెంట్స్",
    "student": "స్టూడెంట్",
    "laptops": "లాప్‌టాప్స్",
    "laptop": "లాప్‌టాప్",
    "resumes": "రెజ్యూమ్‌లు",
    "resume": "రెజ్యూమ్",
    "interviews": "ఇంటర్వ్యూస్",
    "interview": "ఇంటర్వ్యూ",
    "certificates": "సర్టిఫికేట్స్",
    "certificate": "సర్టిఫికేట్",
    "courses": "కోర్సెస్",
    "course": "కోర్స్",
    "tips": "టిప్స్",
    "tip": "టిప్",
    "daily": "డెయిలీ",
    "notifications": "నోటిఫికేషన్స్",
    "notification": "నోటిఫికేషన్",
    "alerts": "అలర్ట్స్",
    "alert": "అలర్ట్",
    "hiring": "హైరింగ్",
    "eligibility": "ఎలిజిబిలిటీ",
    "internships": "ఇంటర్న్‌షిప్స్",
    "internship": "ఇంటర్న్‌షిప్",
    "interns": "ఇంటర్న్స్",
    "intern": "ఇంటర్న్",
    "governments": "గవర్న్మెంట్లు",
    "government": "గవర్న్మెంట్",
    "govt": "గవర్న్మెంట్",
    "roadmaps": "రోడ్‌మ్యాప్స్",
    "roadmap": "రోడ్‌మ్యాప్",
    "videos": "వీడియోస్",
    "video": "వీడియో",
    "links": "లింక్‌లు",
    "link": "లింక్",
    "click": "క్లిక్",
    "downloads": "డౌన్‌లోడ్స్",
    "download": "డౌన్‌లోడ్",
    "subscribe": "సబ్స్క్రైబ్",
    "like": "లైక్",
    "share": "షేర్",
    "comment": "కామెంట్",
    "telugu": "తెలుగు",
    "freshers": "ఫ్రెషర్స్",
    "fresher": "ఫ్రెషర్",
    "radar": "రాడార్",
    "support": "సపోర్ట్",
    "ready": "రెడీ",
    "form": "ఫారం",
    "date": "డేట్",
    "last": "లాస్ట్",
    "degree": "డిగ్రీ",
    "salary": "శాలరీ",
    "package": "ప్యాకేజ్",
    "company": "కంపెనీ",
    "results": "రిజల్ట్స్",
    "result": "రిజల్ట్",
    "paper": "పేపర్",
    "practice": "ప్రాక్టీస్",
    "study": "స్టడీ",
    "online": "ఆన్‌లైన్",
    "new": "న్యూ",
    "now": "నౌ",
    "what": "వాట్",
}

_LATIN_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9+\-#]*")


def split_phrases(text):
    """Splits at sentence and comma punctuation so the voice can pause there."""
    text = (text or "").strip()
    if not text:
        return []
    parts = [p.strip() for p in re.split(r"(?<=[।?!.,;:])\s+", text) if p.strip()]
    return parts or [text]


# ---------------- voice ----------------
VOICE_PROFILES = {
    "mix": {
        "hook":     {"voice": "te-IN-MohanNeural",  "rate": "-5%", "pitch": "+0Hz"},
        "features": {"voice": "te-IN-ShrutiNeural", "rate": "-5%", "pitch": "+3Hz"},
        "cta":      {"voice": "te-IN-ShrutiNeural", "rate": "-8%", "pitch": "+0Hz"},
    },
    "single": {
        "hook":     {"voice": "te-IN-ShrutiNeural", "rate": "-5%", "pitch": "+3Hz"},
        "features": {"voice": "te-IN-ShrutiNeural", "rate": "-5%", "pitch": "+3Hz"},
        "cta":      {"voice": "te-IN-ShrutiNeural", "rate": "-8%", "pitch": "+0Hz"},
    },
}
VOICE_PRESET_DEFAULT = "single"
SCENE_VOICE_SLOT = {"hook": "hook", "line": "features", "students": "features", "cta": "cta"}


def get_voice_preset():
    preset = (os.environ.get("VOICE_PRESET") or VOICE_PRESET_DEFAULT).strip().lower()
    if preset not in VOICE_PROFILES:
        log(f"WARNING: unknown VOICE_PRESET '{preset}', using '{VOICE_PRESET_DEFAULT}'")
        preset = VOICE_PRESET_DEFAULT
    return preset


def profile_for_scene(kind, preset=None, voice_override=None, rate_override=None):
    """Resolve voice/rate/pitch for a scene kind; job voice/rate override the profile."""
    preset = preset or get_voice_preset()
    slot = SCENE_VOICE_SLOT.get(kind, "features")
    profile = VOICE_PROFILES[preset][slot]
    return {
        "preset": preset,
        "slot": slot,
        "voice": voice_override or profile["voice"],
        "rate": rate_override or profile["rate"],
        "pitch": profile["pitch"],
    }


# Words the voice reads badly are either pre-translated (voice_*_te fields in
# the job, pure Telugu script) or replaced with a Telugu spelling from the
# dictionary below. Anything left in Latin script is reported in the log so a
# job with brand-new English words is visible immediately.
LATIN_RE = re.compile(r"[A-Za-z]+")

# Each clip's speed is pulled toward the run's average speech rate so a reel
# never speeds up and slows down between sentences (gTTS vs edge, short vs
# long sentences). Corrections stay small to avoid chipmunk artefacts.
ATEMPO_MIN = 0.90
ATEMPO_MAX = 1.15
# FIX 1: atempo was removed earlier (57ef45e); this block is kept only for
# backwards compatibility with any code that still reads the names.
# All clips now play at natural TTS speed (atempo=1.0).
# Per-clip loudness target; the final master is normalised to -14 LUFS in CI.
VOICE_LOUDNESS = "loudnorm=I=-16:TP=-1.5:LRA=11"



# FIX 1 - Telugu text corruption (ZWNJ). The dictionary only replaces Latin
# words, so Telugu letters, combining marks and U+200C are never modified.

def normalize_te(text):
    text = text or ""
    return _LATIN_WORD_RE.sub(lambda m: TELUGU_WORDS.get(m.group(0).lower(), m.group(0)), text)


def tts_edge(text, voice, rate, out_path, pitch="+0Hz"):
    """Synthesizes with edge-tts and returns word boundaries.

    Returns [(t_ms, d_ms, word), ...]. edge-tts only sends WordBoundary
    events when boundary="WordBoundary" is requested — confirmed to work for
    te-IN-ShrutiNeural, which gives us frame-accurate captions.
    """
    import edge_tts

    async def run():
        com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
        words = []
        with open(out_path, "wb") as f:
            async for chunk in com.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    words.append(
                        (
                            chunk["offset"] / 1e7 * 1000.0,  # ms
                            chunk["duration"] / 1e7 * 1000.0,  # ms
                            chunk["text"],
                        )
                    )
        return words

    return asyncio.run(run())


def tts_gtts(text, voice, rate, out_path):
    from gtts import gTTS

    gTTS(text=text, lang="te").save(out_path)
    return None  # gTTS sends no word timings


def tts_fake(text, voice, rate, out_path):
    # testing only: a quiet tone whose length follows the text length
    seconds = max(1.5, len(text) * 0.06)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"sine=f=220:d={seconds}", "-af", "volume=0.05", out_path],
        check=True,
    )
    return None



ENGINES = {"edge": tts_edge, "gtts": tts_gtts, "fake": tts_fake}


PHRASE_GAP_SECONDS = 0.25


def join_audio_with_gaps(pieces, out_path, gap=PHRASE_GAP_SECONDS):
    """Joins audio pieces into one file with a short silence between them."""
    silence = silence_path(gap)
    args = ["ffmpeg", "-y", "-loglevel", "error"]
    for p in pieces:
        args += ["-i", p]
    args += ["-i", silence]
    n = len(pieces)
    chains = []
    labels = []
    for i in range(n):
        chains.append(f"[{i}:a]aresample=44100[a{i}]")
        labels.append(f"[a{i}]")
        if i < n - 1:
            chains.append(f"[{n}:a]aresample=44100[g{i}]")
            labels.append(f"[g{i}]")
    fc = ";".join(chains) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
    args += [
        "-filter_complex", fc, "-map", "[out]",
        "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "64k", out_path,
    ]
    subprocess.run(args, check=True)


def synth_phrases(tts_text, voice, rate):
    """LEGACY (not used by the pipeline): synthesizes a scene phrase by phrase.

    Kept for older test scripts; the pipeline now uses synth_scene().
    Returns {"pieces": [(path, words|None)], "cps": float, "engine": name}
    or None when every engine failed.
    """
    phrases = split_phrases(tts_text)
    workdir = tempfile.mkdtemp(prefix="tts_")
    pieces = []
    scene_engine = None
    for i, phrase in enumerate(phrases):
        piece = os.path.join(workdir, f"p{i}.mp3")
        engine = None
        words = None
        for name in TTS_ORDER:
            fn = ENGINES.get(name)
            if not fn:
                continue
            for attempt in (1, 2):
                try:
                    if os.path.exists(piece):
                        os.remove(piece)
                    words = fn(phrase, voice, rate, piece)
                    if os.path.exists(piece) and os.path.getsize(piece) > 1000:
                        audio_seconds(piece)
                        engine = name
                        break
                    raise RuntimeError("audio piece is empty")
                except Exception as exc:  # noqa: BLE001
                    log(f"  voice engine '{name}' attempt {attempt} failed: {type(exc).__name__}: {exc}")
                    time.sleep(2)
            if engine:
                break
        if not engine:
            return None
        scene_engine = scene_engine or engine
        # only edge gives timings; if a later phrase fell back, drop them all
        if engine != "edge":
            words = None
        # FIX 5: strip the silence edge-tts bakes in, then keep captions in
        # sync by shifting each word earlier by the leading silence removed.
        removed = trim_silence(piece)
        if words is not None and removed > 0:
            shift = removed * 1000.0
            words = [(max(0.0, t - shift), d, txt) for (t, d, txt) in words]
        pieces.append((piece, words))
    speech_chars = len(re.sub(r"\s+", "", tts_text)) or 1
    speech_time = sum(audio_seconds(p) for p, _ in pieces) or 0.001
    return {
        "pieces": pieces,
        "cps": speech_chars / speech_time,
        "engine": scene_engine,
    }


def synth_scene(text, voice, rate, pitch):
    """Synthesizes the whole scene text with ONE edge-tts call.

    No phrase splitting, no inserted silence. gTTS stays the fallback.
    Trims leading/trailing silence and shifts word timings to match.
    Returns {"pieces": [(path, words|None)], "cps": float, "engine": name}
    or None when every engine failed.
    """
    workdir = tempfile.mkdtemp(prefix="tts_")
    piece = os.path.join(workdir, "scene.mp3")
    engine = None
    words = None
    for name in TTS_ORDER:
        fn = ENGINES.get(name)
        if not fn:
            continue
        for attempt in (1, 2):
            words = None
            try:
                if os.path.exists(piece):
                    os.remove(piece)
                if name == "edge":
                    words = fn(text, voice, rate, piece, pitch=pitch)
                else:
                    words = fn(text, voice, rate, piece)
                if os.path.exists(piece) and os.path.getsize(piece) > 1000:
                    audio_seconds(piece)
                    engine = name
                    break
                raise RuntimeError("audio piece is empty")
            except Exception as exc:  # noqa: BLE001
                log(f"  voice engine '{name}' attempt {attempt} failed: {type(exc).__name__}: {exc}")
                time.sleep(2)
        if engine:
            break
    if not engine:
        return None
    if engine != "edge":
        words = None
    removed = trim_silence(piece)
    if words is not None and removed > 0:
        shift = removed * 1000.0
        words = [(max(0.0, t - shift), d, txt) for (t, d, txt) in words]
    speech_chars = len(re.sub(r"\s+", "", text)) or 1
    speech_time = audio_seconds(piece) or 0.001
    return {
        "pieces": [(piece, words)],
        "cps": speech_chars / speech_time,
        "engine": engine,
    }


def check_clipping(path):
    """Run ffmpeg volumedetect on path; return max_volume in dB (or None)."""
    try:
        out = subprocess.run(
            ["ffmpeg", "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"],
            capture_output=True, text=True, check=True,
        )
        # volumedetect prints to stderr
        text = out.stderr
        for line in text.splitlines():
            if "max_volume:" in line:
                # line like:  [Parsed_volumedetect_0 @ ...] max_volume: -2.3 dB
                parts = line.split("max_volume:")[1].strip()
                val = parts.split()[0]
                return float(val)
    except Exception:  # noqa: BLE001
        pass
    return None


def detect_silences(path, noise_db=-45):
    """Return [(start_s, dur_s)] of silent runs found by ffmpeg silencedetect."""
    try:
        out = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-i", path,
                "-af", f"silencedetect=noise={noise_db}dB:d=0.05",
                "-f", "null", "-",
            ],
            capture_output=True, text=True, check=True,
        )
    except Exception:  # noqa: BLE001
        return []
    starts, silences = [], []
    for line in out.stderr.splitlines():
        if "silence_start:" in line:
            try:
                starts.append(float(line.split("silence_start:")[1].split()[0]))
            except (ValueError, IndexError):
                pass
        elif "silence_end:" in line:
            try:
                end = float(line.split("silence_end:")[1].split("|")[0].strip())
                dur = float(line.split("silence_duration:")[1].split()[0])
                start = starts.pop(0) if starts else max(0.0, end - dur)
                silences.append((start, dur))
            except (ValueError, IndexError):
                pass
    return silences


def trim_silence(path, noise_db=-45, keep=0.05):
    """FIX 5: strip the leading & trailing silence edge-tts bakes into a phrase.

    edge-tts pads every phrase with ~0.19 s of leading and ~1.0 s of trailing
    silence; between phrases that becomes the dead air the old 0.42 s gap only
    widened (measured 1.39 s inside one scene). Trimming leaves `keep` s of
    margin at each end so soft onsets are not clipped, and returns how much
    LEADING silence was removed so the caller can shift word timings to stay
    in sync with the trimmed audio. At tempo is unaffected (no time stretch).
    """

    def _leading():
        d = detect_silences(path, noise_db)
        return (d[0][0] + d[0][1]) if (d and d[0][0] <= 0.05) else 0.0

    lead_before = _leading()
    tmp = path + ".trim.mp3"
    # areverse trick: drop leading silence, flip, drop (now leading) trailing
    # silence, flip back — keeps internal pauses between words intact.
    af = (
        f"silenceremove=start_periods=1:start_silence={keep}:start_threshold={noise_db}dB,"
        "areverse,"
        f"silenceremove=start_periods=1:start_silence={keep}:start_threshold={noise_db}dB,"
        "areverse"
    )
    r = subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", path,
            "-af", af, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", tmp,
        ],
        capture_output=True, text=True,
    )
    if r.returncode != 0 or not os.path.exists(tmp) or os.path.getsize(tmp) < 500:
        if os.path.exists(tmp):
            os.remove(tmp)
        return 0.0  # keep the original if trimming failed
    if audio_seconds(tmp) < 0.05:
        os.remove(tmp)
        return 0.0  # would have removed all speech; keep the original
    lead_after = 0.0
    d = detect_silences(tmp, noise_db)
    if d and d[0][0] <= 0.05:
        lead_after = d[0][0] + d[0][1]
    os.replace(tmp, path)
    return max(0.0, lead_before - lead_after)


def print_gap_report(scenes, fps=FPS, target=0.6, noise_db=-45):
    """FIX 5: print every measured gap between voice segments.

    In-scene phrase gaps come from silencedetect on each clip; the gap
    between two scenes is the trailing silence of scene i (its frame length
    minus where the voice really stops) plus any leading silence of scene
    i+1. Target: every gap <= 0.6 s (the CTA end may be longer).
    """
    log("== Voice gap report (FIX 5) ==")
    if not any(s.get("audio") for s in scenes):
        log("  no voice clips - nothing to measure")
        return
    ends, starts = {}, {}
    worst, worst_at = 0.0, "-"
    for i, s in enumerate(scenes):
        audio = s.get("audio")
        if not audio:
            continue
        clip = os.path.join("public", audio)
        clip_len = audio_seconds(clip)
        scene_len = s["frames"] / fps
        sil = detect_silences(clip, noise_db)
        intra = [(st, du) for st, du in sil if st + du < clip_len - 0.03]
        for st, du in intra:
            status = "OK" if du <= target else "TOO LONG"
            log(f"  scene {i}: phrase gap {du:.2f}s at {st:.2f}s [{status}]")
            if du > worst:
                worst, worst_at = du, f"scene {i} in-clip"
        end_voice = clip_len
        for st, du in sil:
            if st + du >= clip_len - 0.03:
                end_voice = st
        lead = 0.0
        for st, du in sil:
            if st <= 0.03:
                lead = st + du
                break
        ends[i], starts[i] = end_voice, lead
        log(
            f"  scene {i}: voice {clip_len:.2f}s in {scene_len:.2f}s scene, "
            f"trailing gap {scene_len - end_voice:.2f}s"
        )
        tw = scene_len - end_voice
        # the CTA's end pad (1.4 s) is intentionally longer — prompt allows it
        if tw > worst and s.get("kind") != "cta":
            worst, worst_at = tw, f"scene {i} trailing"
    for i in sorted(ends):
        if i + 1 in starts:
            gap = (scenes[i]["frames"] / fps - ends[i]) + starts[i + 1]
            is_cta_end = scenes[i + 1].get("kind") == "cta"
            status = "OK" if gap <= target or is_cta_end else "TOO LONG"
            log(
                f"  gap scene {i}->scene {i + 1} = {gap:.2f}s "
                f"(target <= {target:.1f}s){' [CTA exempt]' if is_cta_end else ''} [{status}]"
            )
            if gap > worst and not is_cta_end:
                worst, worst_at = gap, f"scene {i}->{i + 1}"
    verdict = "PASS" if worst <= target else "FAIL"
    log(f"  worst gap: {worst:.2f}s at {worst_at} (target <= {target:.1f}s) [{verdict}]")


def silence_path(gap):
    path = os.path.join(tempfile.gettempdir(), f"gap_{gap:.2f}.mp3")
    if not os.path.exists(path):
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                "-t", f"{gap:.2f}", "-c:a", "libmp3lame", "-b:a", "64k", path,
            ],
            check=True,
        )
    return path


def finalize_scene(synth, out_path):
    """Joins the phrases with short gaps and loudness-normalizes the clip.
    No time-stretching: every clip plays at natural TTS speed (atempo=1.0).
    Returns {"seconds", "words"} where words are [{t, d, w}] in milliseconds
    on the FINAL timeline, or None.
    """
    pieces = synth["pieces"]
    gap = PHRASE_GAP

    # word boundaries measured on the original timeline (all values in ms)
    words_out = None
    if all(w is not None for _, w in pieces):
        words_out = []
        offset_ms = 0.0
        for path, w in pieces:
            for t_ms, d_ms, txt in w:
                words_out.append(
                    {
                        "t": int(round(offset_ms + t_ms)),
                        "d": int(round(d_ms)),
                        "w": txt,
                    }
                )
            offset_ms += audio_seconds(path) * 1000.0 + gap * 1000.0
        # the last gap is not part of the clip
        if len(pieces) > 1:
            offset_ms -= gap * 1000.0

    joined = out_path + ".joined.mp3"
    if len(pieces) == 1:
        with open(pieces[0][0], "rb") as src, open(joined, "wb") as dst:
            dst.write(src.read())
    else:
        join_audio_with_gaps([p for p, _ in pieces], joined)

    # Natural TTS speed only — no atempo. Just loudness normalization.
    filters = [VOICE_LOUDNESS]
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", joined,
            "-af", ",".join(filters),
            "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k",
            out_path,
        ],
        check=True,
    )
    if os.path.exists(joined):
        os.remove(joined)
    if not os.path.exists(out_path) or os.path.getsize(out_path) < 1000:
        return None
    return {"seconds": audio_seconds(out_path), "words": words_out}



# ---------------- pictures ----------------
# FIX 2: sanitize prompts before they reach the image engine.
# Telugu-script text (with ZWNJ) gets garbled inside AI images, so we strip
# it and replace with a plain English placeholder so the model knows where
# script would appear.
_TELUGU_RE = re.compile(r"[\u0c00-\u0c7f\u200c\u200d]+")


def _sanitize_prompt(prompt):
    """Replace Telugu-script runs with English placeholders; otherwise keep
    the prompt intact."""
    return _TELUGU_RE.sub("[Telugu script]", str(prompt or ""))


# Image models write gibberish when a prompt asks for readable UI. We do NOT
# replace useful visual nouns (laptop, screen, document, book, code) because
# that made the pictures irrelevant to the narration. Keep the scene, allow
# blank screens, and forbid readable text instead.
BANNED_PHRASES = []
_NEUTRAL_OBJECTS = []
NO_TEXT_SUFFIX = (
    ", no readable text, no letters, no words, no numbers, no captions, "
    "no signs, no logos, no watermark, no readable code, no brand names"
)
# FIX 3: camera angles used to derive fresh prompts when the job has fewer
# prompts than picture scenes.
_CAMERA_ANGLES = [
    "close-up of", "wide shot of", "top view of", "low angle view of",
    "over-the-shoulder view of", "side profile view of",
]


def _strip_banned_words(prompt):
    """Compatibility shim. No scene nouns are replaced any more."""
    out = str(prompt or "")
    for i, word in enumerate(sorted(BANNED_PHRASES, key=len, reverse=True)):
        pattern = rf"\b{re.escape(word)}s?\b"
        if re.search(pattern, out, re.IGNORECASE):
            out = re.sub(
                pattern,
                _NEUTRAL_OBJECTS[i % len(_NEUTRAL_OBJECTS)],
                out,
                flags=re.IGNORECASE,
            )
    return out


def build_picture_prompt(base_prompt, style):
    """Keep the scene description, then append the strict no-text suffix."""
    cleaned = _strip_banned_words(_sanitize_prompt(base_prompt))
    return f"{cleaned}, {style}{NO_TEXT_SUFFIX}"


def _ocr_letters(path):
    """FIX 2: OCR the generated picture with tesseract (when installed).

    Returns (available, letters, sample). available is False when
    tesseract is missing - the caller then skips the redraw step.
    """
    if not shutil.which("tesseract"):
        return False, 0, ""
    try:
        out = subprocess.run(
            ["tesseract", path, "stdout"],
            capture_output=True, text=True, timeout=90,
        )
        text = " ".join((out.stdout or "").split())
        return True, len(re.findall(r"[A-Za-z]", text)), text[:80]
    except Exception as exc:  # noqa: BLE001
        log(f"  OCR run failed: {type(exc).__name__}: {exc}")
        return True, 0, ""


def _unique_prompts(prompts, count):
    """Yield `count` unique variants of the prompt list (FIX 3)."""
    base = [str(p).strip() for p in prompts if str(p).strip()]
    if not base:
        return
    for i in range(count):
        idx = i % len(base)
        variant = base[idx]
        yield variant, idx

def looks_like_image(data):
    return data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n" or data[:4] == b"RIFF"


def img_cloudflare(prompt, seed, out_path):
    acc = os.environ.get("CF_ACCOUNT_ID", "").strip()
    tok = os.environ.get("CF_API_TOKEN", "").strip()
    if not acc or not tok:
        raise RuntimeError("CF_ACCOUNT_ID / CF_API_TOKEN not set")
    url = f"https://api.cloudflare.com/client/v4/accounts/{acc}/ai/run/@cf/black-forest-labs/flux-1-schnell"
    body = json.dumps({"prompt": prompt, "steps": 4}).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    img = base64.b64decode(data["result"]["image"])
    if not looks_like_image(img):
        raise RuntimeError("response is not an image")
    with open(out_path, "wb") as f:
        f.write(img)


def img_pollinations(prompt, seed, out_path):
    url = (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(prompt)
        + f"?width=1024&height=1024&nologo=true&seed={seed}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        img = resp.read()
    if not looks_like_image(img):
        raise RuntimeError("response is not an image")
    with open(out_path, "wb") as f:
        f.write(img)


def img_fake(prompt, seed, out_path):
    # testing only
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"gradients=s=1024x1024:seed={seed}:speed=0.01", "-frames:v", "1", out_path],
        check=True,
    )


IMG_ENGINES = {"cloudflare": img_cloudflare, "pollinations": img_pollinations, "fake": img_fake}
IMG_ORDER = [e.strip() for e in os.environ.get("IMG_ORDER", "cloudflare,pollinations").split(",") if e.strip()]


def make_image(prompt, seed, out_path):
    for name in IMG_ORDER:
        fn = IMG_ENGINES.get(name)
        if not fn:
            continue
        try:
            fn(prompt, seed, out_path)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 5000:
                return name
            raise RuntimeError("image file is too small")
        except Exception as exc:  # noqa: BLE001
            log(f"  image engine '{name}' failed: {type(exc).__name__}: {exc}")
    return None


# ---------------- sfx ----------------
SFX_SPECS = {
    "sfx_whoosh.mp3": (
        "anoisesrc=color=pink:duration=0.6:seed=3",
        "bandpass=f=1800:w=1.5,afade=t=in:d=0.12,afade=t=out:st=0.25:d=0.35,volume=2.5",
    ),
    "sfx_pop.mp3": (
        "sine=f=880:d=0.18",
        "afade=t=out:st=0.02:d=0.16,volume=0.8",
    ),
    "sfx_ding.mp3": (
        "sine=f=1318:d=0.7",
        "afade=t=out:st=0.05:d=0.65,volume=0.7",
    ),
}
# every sfx file is scaled to this measured peak (dB) after generation, so
# the template volumes below map to one predictable in-mix level
SFX_PEAK_DB = -6.0


def make_sfx_files():
    """Generate the three SFX (whoosh, pop, ding) with ffmpeg.

    Each file is then scaled to SFX_PEAK_DB (default -6 dB) so every effect
    starts from the same measured level; the templates play them at a fixed
    volume below the voice.
    """
    for name, (source, af) in SFX_SPECS.items():
        out_path = os.path.join("public", name)
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-f", "lavfi", "-i", source,
                "-af", af,
                "-c:a", "libmp3lame", "-b:a", "96k",
                out_path,
            ],
            check=True,
        )
        if not os.path.exists(out_path) or os.path.getsize(out_path) < 1000:
            raise RuntimeError(f"{name} is empty")
        peak = check_clipping(out_path)
        if peak is not None:
            delta = SFX_PEAK_DB - peak
            if abs(delta) > 0.3:
                tmp = out_path + ".lvl.mp3"
                subprocess.run(
                    [
                        "ffmpeg", "-y", "-loglevel", "error",
                        "-i", out_path,
                        "-af", f"volume={delta:.2f}dB",
                        "-b:a", "96k", tmp,
                    ],
                    check=True,
                )
                os.replace(tmp, out_path)
                peak = check_clipping(out_path)
        log(f"sfx {name}: peak={peak:.1f} dB (target {SFX_PEAK_DB:.1f} dB)")


# ---------------- music ----------------
def make_music(seconds, root, out_path):
    """A soft, slow pad: open chord, gentle tremolo, low-pass and echo.

    FIX 4: music is ON by default; fade in 0.5 s and fade out 1 s; the file is
    measured with volumedetect and scaled so its peak sits at MUSIC_PEAK_DB
    (default -18 dB) — the templates play music at a fixed volume, so this is
    the "simple volume" duck that keeps music under the voice while the gaps
    between phrases are no longer digital silence. Minimum 5 s so the fades
    work.
    """
    safe_seconds = max(seconds, 5.0)
    ratios = [1.0, 1.5, 2.0, 2.25, 3.0]
    d = f"{safe_seconds:.2f}"
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for r in ratios:
        cmd += ["-f", "lavfi", "-i", f"sine=f={root * r:.2f}:d={d}"]

    fade_out_start = safe_seconds - 1.0
    graph = (
        "[0][1][2][3][4]amix=inputs=5:normalize=0,volume=0.30,"
        "tremolo=f=0.18:d=0.35,lowpass=f=1100,"
        "aecho=0.8:0.6:90|180:0.35|0.22,"
        f"afade=t=in:d=0.5,afade=t=out:st={fade_out_start:.2f}:d=1.0"
    )
    cmd += ["-filter_complex", graph, "-ar", "44100", "-b:a", "128k", out_path]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        tail = (proc.stderr or "").strip()[-500:]
        log(f"music ffmpeg failed (exit {proc.returncode}): {tail}")
        raise RuntimeError(f"ffmpeg music generation failed: {tail}")
    peak = check_clipping(out_path)
    if peak is None:
        raise RuntimeError("could not measure the generated music (volumedetect failed)")
    try:
        target_peak = float(os.environ.get("MUSIC_PEAK_DB", "-18").strip())
    except ValueError:
        log("WARNING: MUSIC_PEAK_DB is not a number, using -18")
        target_peak = -18.0
    delta = target_peak - peak
    if abs(delta) > 0.3:
        tmp = out_path + ".lvl.mp3"
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", out_path,
                "-af", f"volume={delta:.2f}dB",
                "-b:a", "128k", tmp,
            ],
            check=True,
        )
        os.replace(tmp, out_path)
        peak = check_clipping(out_path)
    log(
        f"music pad {safe_seconds:.1f}s, fade-in 0.5s, fade-out 1s, "
        f"peak={peak:.1f} dB (MUSIC_PEAK_DB={target_peak:.1f})"
    )


def log_sfx_placements(scenes):
    """Print where template v1 puts the whoosh/pop/ding (global frames)."""
    starts = []
    acc = 0
    for s in scenes:
        starts.append(acc)
        acc += s["frames"]
    log("== SFX placements (v1 timeline, 30 fps) ==")
    counts = {"whoosh": 0, "pop": 0, "ding": 0}
    for i, s in enumerate(scenes):
        events = []
        if i > 0:
            events.append(f"whoosh@{starts[i]}")
            counts["whoosh"] += 1
        events.append(f"pop@{starts[i]}")
        counts["pop"] += 1
        if s.get("kind") == "cta":
            events.append(f"ding@{starts[i]}")
            counts["ding"] += 1
        log(f"  scene {i} ({s['kind']}) frames={s['frames']}: " + ", ".join(events))
    log(
        f"  totals: whoosh={counts['whoosh']}, pop={counts['pop']}, "
        f"ding={counts['ding']}, all={sum(counts.values())}"
    )


def main():
    job = load_job()
    category = job.get("category") or "ai_tools"
    cat = CATEGORY.get(category, CATEGORY["ai_tools"])
    preset = get_voice_preset()
    voice_override = job.get("voice")
    rate_override = job.get("rate")
    want_music = job.get("music", True)
    if "music" in job and not job["music"]:
        log('music=off: job JSON sets "music": false - music is ON by default when the field is omitted')
    want_sfx = job.get("sfx", True)

    for d in ("public/audio", "public/images"):
        os.makedirs(d, exist_ok=True)
        for fname in os.listdir(d):
            if fname != ".gitkeep":
                os.remove(os.path.join(d, fname))

    seed_src = (job.get("tool_name", "") + job.get("hook_te", "") + job.get("summary_te", "")).encode("utf-8")
    seed = int(hashlib.md5(seed_src).hexdigest()[:8], 16) % 100000

    # ----- scenes -----
    plan = []
    if job.get("hook_te"):
        plan.append(("hook", job["hook_te"].strip(), ""))
    for i, line in enumerate(split_sentences(job.get("summary_te", ""))):
        plan.append(("line", line, cat["scene_labels"][min(i, len(cat["scene_labels"]) - 1)]))
    if job.get("for_students_te"):
        plan.append(("students", job["for_students_te"].strip(), cat["students"]))
    plan.append(("cta", (job.get("cta_te") or cat["cta"]).strip(), ""))
    if len(plan) < 2:
        log("ERROR: job needs at least hook_te or summary_te")
        sys.exit(1)

    # FIX 1: remember the exact input text per scene; asserted against
    # the final props.json after it is written.
    input_texts = [t for _k, t, _l in plan]

    # ----- which text the voice speaks -----
    # Optional pure-Telugu fields (voice_hook_te / voice_summary_te /
    # voice_students_te / voice_cta_te): the same sentences written only in
    # Telugu script with English words spelled phonetically. When present the
    # voice reads THESE and the screen still shows the normal text. When
    # missing we fall back to normalize_te() + the ~90-word dictionary.
    hook_voice = (job.get("voice_hook_te") or "").strip()
    students_voice = (job.get("voice_students_te") or "").strip()
    cta_voice = (job.get("voice_cta_te") or "").strip()
    raw_summary_voice = (job.get("voice_summary_te") or "").strip()
    summary_voice_parts = split_sentences(raw_summary_voice) if raw_summary_voice else []
    summary_display_parts = [t for k, t, _ in plan if k == "line"]

    voice_texts = []
    line_i = 0
    for kind, text, _label in plan:
        if kind == "hook":
            voice_texts.append(hook_voice)
        elif kind == "line":
            if summary_voice_parts and len(summary_voice_parts) == len(summary_display_parts):
                voice_texts.append(summary_voice_parts[line_i])
            else:
                if summary_voice_parts:
                    log(
                        f"WARNING: voice_summary_te has {len(summary_voice_parts)} sentences but the screen "
                        f"has {len(summary_display_parts)} — line scenes fall back to the dictionary"
                    )
                voice_texts.append("")
            line_i += 1
        elif kind == "students":
            voice_texts.append(students_voice)
        else:
            voice_texts.append(cta_voice)
    from_field_count = sum(1 for v in voice_texts if v)
    if from_field_count:
        log(f"voice_*_te fields used for {from_field_count}/{len(plan)} scenes (pure Telugu for the voice)")

    # Merge scenes with fewer than 3 spoken words into the next scene so no
    # clip is just 1-2 words. Full-stop pauses between phrases are preserved.
    merged_plan = []
    merged_voice = []
    i = 0
    while i < len(plan):
        kind, text, label = plan[i]
        vtext = voice_texts[i]
        spoken = vtext.strip() if vtext and vtext.strip() else text
        word_count = len(spoken.split())
        if word_count < 3 and i + 1 < len(plan):
            next_kind, next_text, next_label = plan[i + 1]
            next_vtext = voice_texts[i + 1]
            merged_text = (text + " " + next_text).strip()
            if vtext and vtext.strip() and next_vtext and next_vtext.strip():
                merged_vtext = (vtext.strip() + " " + next_vtext.strip())
            elif vtext and vtext.strip():
                merged_vtext = vtext.strip()
            elif next_vtext and next_vtext.strip():
                merged_vtext = next_vtext.strip()
            else:
                merged_vtext = ""
            merged_plan.append((kind, merged_text, label))
            merged_voice.append(merged_vtext)
            log(f"merged scene {i} ({word_count} words) with scene {i+1} -> \"{merged_text[:60]}...\"")
            i += 2
        else:
            merged_plan.append((kind, text, label))
            merged_voice.append(vtext)
            i += 1
    plan = merged_plan
    voice_texts = merged_voice

    # ----- voice -----
    log("== Voice-over ==")
    log(f"voice preset: {preset} (env VOICE_PRESET; presets: single|mix)")
    if voice_override:
        log(f"job voice override: {voice_override}")
    if rate_override:
        log(f"job rate override: {rate_override}")
    synths = []
    for i, (kind, text, _label) in enumerate(plan):
        tts_text = (voice_texts[i] or "").strip() or normalize_te(text)
        from_field = bool((voice_texts[i] or "").strip())
        latin = LATIN_RE.findall(tts_text)
        if from_field:
            status = (
                "pure Telugu PASS"
                if not latin
                else f"NOT pure Telugu — Latin words: {sorted(set(w.lower() for w in latin))}"
            )
            log(f"scene {i} ({kind}) TTS text from voice_*_te: {status}")
            if latin:
                log("  WARNING: voice_*_te must be Telugu script only; these Latin words will be mispronounced")
        else:
            if latin:
                new_words = sorted(set(w.lower() for w in latin))
                log(
                    f"scene {i} ({kind}) dictionary fallback — brand-new English words NOT in the "
                    f"dictionary, sent to TTS as-is: {new_words}"
                )
                log("  (edge-tts will read them with English pronunciation; durations below show the result)")
            else:
                log(f"scene {i} ({kind}) dictionary fallback — text is pure Telugu script")
        log(f"  text sent to TTS: {tts_text}")
        # FIX 1: assertions — voice_*_te input must reach TTS verbatim and
        # the dictionary fallback must never change Telugu marks or ZWNJ.
        if from_field:
            assert tts_text == (voice_texts[i] or "").strip(), \
                "FIX 1: TTS text must equal the voice_*_te input"
        else:
            # FIX 1: normalize_te only replaces Latin words with Telugu
            # spellings. That can ADD Telugu marks/ZWNJ (e.g. "updates" ->
            # "అప్‌డేట్స్") but must never DROP marks already in the input.
            # Pure-Telugu input has nothing to replace -> byte-identical.
            zwnj = "\u200c"

            def _marks(s):
                return sum(
                    1
                    for c in s
                    if ("\u0c3e" <= c <= "\u0c4d")
                    or ("\u0c55" <= c <= "\u0c56")
                    or ("\u0c62" <= c <= "\u0c63")
                )

            assert tts_text.count(zwnj) >= text.count(zwnj), \
                "FIX 1: normalize_te dropped a ZWNJ from the input"
            assert _marks(tts_text) >= _marks(text), \
                "FIX 1: normalize_te dropped a Telugu combining mark"
            if not LATIN_RE.search(text):
                assert tts_text == text, \
                    "FIX 1: normalize_te altered pure-Telugu input text"
        _test_word = ("\u0c2a\u0c4d\u0c30\u0c3e\u0c1c\u0c46\u0c15\u0c4d\u0c1f\u0c4d"
                      "\u200c\u0c32\u0c4b")  # test word with ZWNJ
        if _test_word in tts_text:
            log(f"  FIX 1 test word OK in TTS text: {_test_word}"
                f" codepoints={[hex(ord(c)) for c in _test_word]}")
        settings = profile_for_scene(kind, preset, voice_override, rate_override)
        s = synth_scene(tts_text, settings["voice"], settings["rate"], settings["pitch"])
        if s is None:
            synths = None
            break
        synths.append((s, tts_text, from_field, settings))

    voiced = None
    if synths is None:
        log("WARNING: voice-over failed for every engine. The video will be silent.")
        for fname in os.listdir("public/audio"):
            if fname != ".gitkeep":
                os.remove(os.path.join("public/audio", fname))
    else:
        # No time-stretching: every clip plays at natural TTS speed (atempo=1.0).
        voice_engine = synths[0][0]["engine"]
        voiced = []
        for i, (s, tts_text, _from_field, settings) in enumerate(synths):
            rel = f"audio/scene_{i}.mp3"
            full = os.path.join("public", rel)
            res = finalize_scene(s, full)
            if res is None:
                log(f"scene {i}: finalizing the clip failed")
                voiced = None
                break
            # clipping check
            max_vol = check_clipping(full)
            clip_status = "OK" if max_vol is not None and max_vol < 0 else (
                "CLIPPING!" if max_vol is not None else "unknown"
            )
            kind = plan[i][0]
            long_silences = sum(1 for _st, dur in detect_silences(full, -45) if dur > 0.3)
            mv_txt = f"{max_vol:.1f} dB" if max_vol is not None else "n/a"
            log(
                f"scene {i} ({kind}) preset={settings['preset']} "
                f"voice={settings['voice']} rate={settings['rate']} pitch={settings['pitch']} "
                f"seconds={res['seconds']:.2f} silences>0.3s={long_silences} "
                f"max_volume={mv_txt} ({clip_status}) engine={s['engine']}"
            )
            voiced.append((rel, res["seconds"], res["words"]))
        if voiced is None:
            for fname in os.listdir("public/audio"):
                if fname != ".gitkeep":
                    os.remove(os.path.join("public/audio", fname))
        else:
            log(f"voice engine used: {voice_engine}; every clip at natural TTS speed (atempo=1.0)")


    # ----- pictures -----
    log("== Pictures ==")
    image_prompts = job.get("image_prompts")
    if isinstance(image_prompts, str):
        # image_prompts may arrive as a JSON STRING of an array
        try:
            image_prompts = json.loads(image_prompts)
        except json.JSONDecodeError:
            image_prompts = []
    raw_prompts = [p for p in (image_prompts or []) if str(p).strip()]
    if not raw_prompts:
        raw_prompts = list(cat["images"])
        log("no image_prompts in the job, using generic prompts for this category")
    n = len(plan) - sum(1 for k, _, _ in plan if k == "cta")
    style = (
        f"{cat['style']} color palette, modern clean illustration, cinematic lighting, "
        "clear focal subject, accurate proportions, no real people's faces"
    )
    # FIX 3: never reuse a prompt across scenes. With fewer base prompts
    # than picture scenes, derive extras by changing the camera angle.
    base_for_scene = []
    for scene_i in range(n):
        if scene_i < len(raw_prompts):
            base_for_scene.append((str(raw_prompts[scene_i]).strip(), scene_i))
        else:
            angle = _CAMERA_ANGLES[(scene_i - len(raw_prompts)) % len(_CAMERA_ANGLES)]
            src_p = str(raw_prompts[scene_i % len(raw_prompts)]).strip()
            base_for_scene.append((f"{angle} {src_p}", scene_i % len(raw_prompts)))
    images = []
    used_prompts = set()
    file_meta = {}
    for scene_i, (kind, text, label) in enumerate(plan):
        if kind == "cta":
            images.append(None)
            continue
        base_prompt, orig_idx = base_for_scene[scene_i]
        # FIX 2: replace banned words and append the strict no-text suffix.
        prompt = build_picture_prompt(base_prompt, style)
        for attempt in range(12):
            if prompt not in used_prompts:
                break
            angle = _CAMERA_ANGLES[attempt % len(_CAMERA_ANGLES)]
            prompt = build_picture_prompt(f"{angle} {base_prompt}", style)
        used_prompts.add(prompt)
        seed_i = seed + scene_i
        rel = f"images/scene_{scene_i}.jpg"
        full = os.path.join("public", rel)
        log(f"scene {scene_i}: seed={seed_i} prompt={prompt}")
        engine = make_image(prompt, seed_i, full)
        file_meta[rel] = (prompt, seed_i, engine)
        # FIX 2: OCR the picture; if tesseract finds 3+ letters of fake
        # text, redraw ONCE with a new seed and a stricter prompt.
        if engine and os.path.exists(full):
            ocr_ok, letters, sample = _ocr_letters(full)
            if not ocr_ok:
                log(f"scene {scene_i}: OCR skipped (tesseract not installed)")
            elif letters >= 3:
                strict = (
                    prompt
                    + ", extremely plain flat vector illustration, "
                    + "absolutely no written characters anywhere"
                )
                seed_i = seed_i + 977
                log(
                    f"scene {scene_i}: OCR found {letters} letters "
                    f"({sample!r}) -> regenerating once with seed {seed_i}"
                )
                new_engine = make_image(strict, seed_i, full)
                if new_engine:
                    engine = new_engine
                    used_prompts.add(strict)
                    file_meta[rel] = (strict, seed_i, engine)
                else:
                    log(f"scene {scene_i}: regeneration failed, keeping the first picture")
            else:
                log(f"scene {scene_i}: OCR clean ({letters} letters)")
        if engine:
            log(f"scene {scene_i}: picture from {engine} (base prompt idx {orig_idx})")
            images.append(rel)
        else:
            log(f"scene {scene_i}: no picture, a motion graphic will be drawn")
            images.append(None)
    # FIX 3: two scenes must never share the same picture file (hash check).
    seen_hashes = {}
    for rel, (mprompt, _mseed, _mengine) in list(file_meta.items()):
        full = os.path.join("public", rel)
        if not os.path.exists(full):
            continue
        with open(full, "rb") as fh:
            digest = hashlib.md5(fh.read()).hexdigest()
        if digest in seen_hashes:
            other = seen_hashes[digest]
            new_seed = seed + 4000 + len(seen_hashes)
            retry = mprompt + ", different composition and perspective"
            log(
                f"FIX 3: {rel} is byte-identical to {other} -> "
                f"regenerating with seed {new_seed}"
            )
            new_engine = make_image(retry, new_seed, full)
            if new_engine:
                file_meta[rel] = (retry, new_seed, new_engine)
                with open(full, "rb") as fh:
                    digest = hashlib.md5(fh.read()).hexdigest()
                log(f"FIX 3: {rel} regenerated from {new_engine} (seed {new_seed})")
        if digest not in seen_hashes:
            seen_hashes[digest] = rel
        else:
            log(f"FIX 3 WARNING: {rel} still identical to {seen_hashes[digest]}")

    # ----- timing -----
    scenes = []
    for i, (kind, text, label) in enumerate(plan):
        words = None
        if voiced:
            rel, seconds, words = voiced[i]
            audio_rel = rel
        else:
            audio_rel = None
            seconds = min(9.0, max(2.8, len(text) * 0.075))
        pad = 1.4 if kind == "cta" else SCENE_PAD
        frames = int(math.ceil((seconds + pad) * FPS))
        scene = {"kind": kind, "text": text, "label": label, "audio": audio_rel, "image": images[i], "frames": frames}
        # optional fields (only present when the voice pipeline produced them,
        # so older props consumers keep working unchanged)
        if audio_rel:
            scene["audioSeconds"] = round(seconds, 3)
        if words:
            scene["words"] = words
        scenes.append(scene)

    total = sum(s["frames"] for s in scenes) / FPS

    print_gap_report(scenes)

    # ----- music -----
    music_rel = None
    if want_music:
        try:
            make_music(total + 1.0, cat["root"], "public/music.mp3")
            music_rel = "music.mp3"
            log("music=on: ffmpeg pad written to public/music.mp3")
        except Exception as exc:  # noqa: BLE001
            log(f"WARNING: music failed ({exc}). Continuing without music.")

    # ----- sound effects -----
    sfx_rels = {"whoosh": None, "pop": None, "ding": None}
    for name in SFX_SPECS:
        path = os.path.join("public", name)
        if os.path.exists(path):
            os.remove(path)
    if want_sfx:
        try:
            make_sfx_files()
            sfx_rels = {
                "whoosh": "sfx_whoosh.mp3",
                "pop": "sfx_pop.mp3",
                "ding": "sfx_ding.mp3",
            }
            log("== SFX == whoosh, pop and ding created")
            log_sfx_placements(scenes)
        except Exception as exc:  # noqa: BLE001
            log(f"WARNING: sound effects failed ({exc}). Continuing without them.")
            for name in SFX_SPECS:
                path = os.path.join("public", name)
                if os.path.exists(path):
                    os.remove(path)
    else:
        log('sfx=off: job JSON sets "sfx": false - no whoosh/pop/ding')

    props = {
        "brand": job.get("brand") or "Fresher Radar",
        "category": category if category in CATEGORY else "ai_tools",
        "categoryLabel": cat["label"],
        "badge": cat["badge"],
        "tagline": cat["tagline"],
        "toolName": job.get("tool_name") or "",
        "pricing": job.get("pricing") or "",
        "seed": seed,
        "fontMode": FONT_MODE,
        "music": music_rel,
        "sfx": sfx_rels["whoosh"],
        "sfxPop": sfx_rels["pop"],
        "sfxDing": sfx_rels["ding"],
        "scenes": scenes,
    }
    with open("public/props.json", "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False, indent=2)

    # FIX 1: for every field, the text in props.json must equal the job
    # input text (merged scenes are single-space joins of two inputs).
    with open("public/props.json", "r", encoding="utf-8") as f:
        check_props = json.load(f)
    valid_texts = set(input_texts)
    valid_texts.update(
        f"{input_texts[k]} {input_texts[k + 1]}" for k in range(len(input_texts) - 1)
    )
    for sc in check_props["scenes"]:
        assert sc["text"] in valid_texts, \
            f"FIX 1: props.json text not from the job input: {sc['text']!r}"
    log(
        f"FIX 1 assertion PASS: {len(check_props['scenes'])} scene texts in "
        "props.json equal the job input"
    )

    got_images = sum(1 for s in scenes if s["image"])
    log(
        f"OK: {len(scenes)} scenes, about {total:.1f} seconds, voice={'on' if voiced else 'OFF'}, "
        f"pictures={got_images}/{sum(1 for s in scenes if s['kind'] != 'cta')}, music={'on' if music_rel else 'off'}"
    )


if __name__ == "__main__":
    main()
