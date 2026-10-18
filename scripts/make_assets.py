"""
Prepares everything Remotion needs for one reel:
  1. Telugu voice-over for every scene (edge-tts first, Google TTS as backup, silent if both fail)
     - Optional job fields voice_hook_te / voice_summary_te / voice_students_te / voice_cta_te:
       the same sentences in PURE Telugu script (English words spelled phonetically).
       When present the voice reads these; the screen still shows the normal text.
       When missing, normalize_te() + the ~90-word dictionary is used as before.
     - edge-tts word boundaries (boundary="WordBoundary") become scene.words in
       props.json, so captions reveal word-by-word with the voice.
     - Every clip is speed-pulled toward the run's average speech rate and
       loudness-normalized (loudnorm -16 LUFS / -1.5 dBTP), so speed and level
       are uniform across scenes.
  2. One picture per scene from the image prompts (Cloudflare FLUX, then Pollinations; a motion graphic is drawn if both fail)
  3. A soft background music pad (made with ffmpeg, no download needed)
  4. A subtle transition whoosh (sfx, ffmpeg) — disable with job "sfx": false
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
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

FPS = 30
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
        "cta": "రోజూ ఇలాంటి AI tools updates కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
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
        "cta": "రోజూ ఇలాంటి jobs updates కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
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
        "cta": "ఇలాంటి govt jobs notifications కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
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
        "cta": "ఇలాంటి internships కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
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
        "cta": "ఇలాంటి free courses కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
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
        "cta": "ఇలాంటి career tips కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి.",
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

_WORD_RE = re.compile(
    r"\b(" + "|".join(sorted((re.escape(w) for w in TELUGU_WORDS), key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)


def normalize_te(text):
    """Replaces common English words with a Telugu spelling for the voice."""
    return _WORD_RE.sub(lambda m: TELUGU_WORDS[m.group(0).lower()], (text or "").strip())


def split_phrases(text):
    """Splits at sentence and comma punctuation so the voice can pause there."""
    text = (text or "").strip()
    if not text:
        return []
    parts = [p.strip() for p in re.split(r"(?<=[।?!.,;:])\s+", text) if p.strip()]
    return parts or [text]


# ---------------- voice ----------------
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
# Per-clip loudness target; the final master is normalised to -14 LUFS in CI.
VOICE_LOUDNESS = "loudnorm=I=-16:TP=-1.5:LRA=11"


def tts_edge(text, voice, rate, out_path):
    """Synthesizes with edge-tts and returns word boundaries.

    Returns [(t_ms, d_ms, word), ...]. edge-tts only sends WordBoundary
    events when boundary="WordBoundary" is requested — confirmed to work for
    te-IN-ShrutiNeural, which gives us frame-accurate captions.
    """
    import edge_tts

    async def run():
        com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
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


PHRASE_GAP_SECONDS = 0.42


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
    """Synthesizes one scene phrase by phrase (short pauses between phrases).

    Returns {"pieces": [(path, words|None)], "cps": float, "engine": name}
    or None when every engine failed.
    cps = characters per second of actual speech (gaps excluded) — used to
    bring every clip in the run to the same speaking speed.
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
        pieces.append((piece, words))
    speech_chars = len(re.sub(r"\s+", "", tts_text)) or 1
    speech_time = sum(audio_seconds(p) for p, _ in pieces) or 0.001
    return {
        "pieces": pieces,
        "cps": speech_chars / speech_time,
        "engine": scene_engine,
    }


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


def finalize_scene(synth, out_path, atempo=1.0):
    """Joins the phrases with short gaps, applies the speed correction and
    loudness-normalizes the clip. Returns {"seconds", "words"} where words
    are [{t, d, w}] in milliseconds on the FINAL timeline, or None.
    """
    pieces = synth["pieces"]
    gap = PHRASE_GAP_SECONDS

    # word boundaries measured on the original timeline (all values in ms)
    words_out = None
    if all(w is not None for _, w in pieces):
        words_out = []
        offset_ms = 0.0
        for path, w in pieces:
            for t_ms, d_ms, txt in w:
                words_out.append(
                    {
                        "t": int(round((offset_ms + t_ms) / atempo)),
                        "d": int(round(d_ms / atempo)),
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

    filters = []
    if abs(atempo - 1.0) > 0.01:
        filters.append(f"atempo={atempo:.4f}")
    filters.append(VOICE_LOUDNESS)
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
def make_sfx(out_path):
    """A short, quiet noise whoosh for scene cuts — generated with ffmpeg."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "anoisesrc=color=pink:duration=0.70:seed=3",
            "-af",
            (
                "lowpass=f=2500,"
                "afade=t=in:d=0.04,afade=t=out:st=0.60:d=0.10,"
                "aformat=sample_rates=44100:channel_layouts=mono"
            ),
            "-c:a", "libmp3lame", "-b:a", "96k",
            out_path,
        ],
        check=True,
    )
    if not os.path.exists(out_path) or os.path.getsize(out_path) < 1000:
        raise RuntimeError("sfx file is empty")


# ---------------- music ----------------
def make_music(seconds, root, out_path):
    """A soft, slow pad: open chord, gentle tremolo, low-pass and echo. No download needed."""
    ratios = [1.0, 1.5, 2.0, 2.25, 3.0]
    d = f"{seconds:.2f}"
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for r in ratios:
        cmd += ["-f", "lavfi", "-i", f"sine=f={root * r:.2f}:d={d}"]
    fade_out_start = max(0.0, seconds - 2.5)
    graph = (
        "[0][1][2][3][4]amix=inputs=5:normalize=0,volume=0.30,"
        "tremolo=f=0.18:d=0.35,lowpass=f=1100,"
        "aecho=0.8:0.6:90|180:0.35|0.22,"
        f"afade=t=in:d=2,afade=t=out:st={fade_out_start:.2f}:d=2.5"
    )
    cmd += ["-filter_complex", graph, "-ar", "44100", "-b:a", "128k", out_path]
    subprocess.run(cmd, check=True)


def main():
    job = load_job()
    category = job.get("category") or "ai_tools"
    cat = CATEGORY.get(category, CATEGORY["ai_tools"])
    voice = job.get("voice") or VOICE_DEFAULT
    rate = job.get("rate") or RATE_DEFAULT
    want_music = job.get("music", True)
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

    # ----- voice -----
    log("== Voice-over ==")
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
        s = synth_phrases(tts_text, voice, rate)
        if s is None:
            synths = None
            break
        synths.append((s, tts_text, from_field))

    voiced = None
    if synths is None:
        log("WARNING: voice-over failed for every engine. The video will be silent.")
        for fname in os.listdir("public/audio"):
            if fname != ".gitkeep":
                os.remove(os.path.join("public/audio", fname))
    else:
        # uniform speed: pull every clip toward the run's average speech rate
        cps_values = [s["cps"] for s, _, _ in synths]
        target_cps = sum(cps_values) / len(cps_values)
        voice_engine = synths[0][0]["engine"]
        voiced = []
        for i, (s, tts_text, _from_field) in enumerate(synths):
            atempo = 1.0
            if len(synths) > 1 and s["cps"] > 0:
                atempo = min(ATEMPO_MAX, max(ATEMPO_MIN, target_cps / s["cps"]))
            rel = f"audio/scene_{i}.mp3"
            full = os.path.join("public", rel)
            res = finalize_scene(s, full, atempo)
            if res is None:
                log(f"scene {i}: finalizing the clip failed")
                voiced = None
                break
            n_words = len(res["words"]) if res["words"] else 0
            log(
                f"scene {i}: {res['seconds']:.2f}s engine={s['engine']} "
                f"cps={s['cps']:.1f} atempo={atempo:.3f} word_timings={n_words}"
            )
            voiced.append((rel, res["seconds"], res["words"]))
        if voiced is None:
            for fname in os.listdir("public/audio"):
                if fname != ".gitkeep":
                    os.remove(os.path.join("public/audio", fname))
        else:
            log(
                f"voice engine used: {voice_engine}; speech-rate target {target_cps:.1f} chars/s "
                f"(every clip pulled toward it, range {ATEMPO_MIN}-{ATEMPO_MAX})"
            )


    # ----- pictures -----
    log("== Pictures ==")
    prompts = [p for p in (job.get("image_prompts") or []) if str(p).strip()]
    if not prompts:
        prompts = list(cat["images"])
        log("no image_prompts in the job, using generic prompts for this category")
    style = (
        f"{cat['style']} color palette, modern clean illustration, soft lighting, "
        "no text, no letters, no logos, no watermark, no real people's faces"
    )
    visual_idx = 0
    images = []
    for i, (kind, text, label) in enumerate(plan):
        if kind == "cta":
            images.append(None)
            continue
        prompt = f"{prompts[visual_idx % len(prompts)]}, {style}"
        visual_idx += 1
        rel = f"images/scene_{i}.jpg"
        engine = make_image(prompt, seed + i, os.path.join("public", rel))
        if engine:
            log(f"scene {i}: picture from {engine}")
            images.append(rel)
        else:
            log(f"scene {i}: no picture, a motion graphic will be drawn")
            images.append(None)

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
        pad = 1.4 if kind == "cta" else 0.6
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

    # ----- music -----
    music_rel = None
    if want_music:
        try:
            make_music(total + 1.0, cat["root"], "public/music.mp3")
            music_rel = "music.mp3"
            log("== Music == background pad created")
        except Exception as exc:  # noqa: BLE001
            log(f"WARNING: music failed ({exc}). Continuing without music.")

    # ----- transition sound -----
    sfx_rel = None
    sfx_path = "public/sfx_whoosh.mp3"
    if os.path.exists(sfx_path):
        os.remove(sfx_path)
    if want_sfx:
        try:
            make_sfx(sfx_path)
            sfx_rel = "sfx_whoosh.mp3"
            log("== SFX == subtle transition whoosh created")
        except Exception as exc:  # noqa: BLE001
            log(f"WARNING: transition sound failed ({exc}). Continuing without it.")

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
        "sfx": sfx_rel,
        "scenes": scenes,
    }
    with open("public/props.json", "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False, indent=2)

    got_images = sum(1 for s in scenes if s["image"])
    log(
        f"OK: {len(scenes)} scenes, about {total:.1f} seconds, voice={'on' if voiced else 'OFF'}, "
        f"pictures={got_images}/{sum(1 for s in scenes if s['kind'] != 'cta')}, music={'on' if music_rel else 'off'}"
    )


if __name__ == "__main__":
    main()
