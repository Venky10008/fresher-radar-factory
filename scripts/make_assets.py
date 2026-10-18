"""
Prepares everything Remotion needs for one reel:
  1. Telugu voice-over for every scene (edge-tts first, Google TTS as backup, silent if both fail)
  2. One picture per scene from the image prompts (Cloudflare FLUX, then Pollinations; a motion graphic is drawn if both fail)
  3. A soft background music pad (made with ffmpeg, no download needed)
  4. public/props.json
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
import time
import urllib.parse
import urllib.request

FPS = 30
VOICE_DEFAULT = "te-IN-ShrutiNeural"  # other Telugu voice: te-IN-MohanNeural
RATE_DEFAULT = "+6%"
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


# ---------------- voice ----------------
def tts_edge(text, voice, rate, out_path):
    import edge_tts

    asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(out_path))


def tts_gtts(text, voice, rate, out_path):
    from gtts import gTTS

    gTTS(text=text, lang="te").save(out_path)


def tts_fake(text, voice, rate, out_path):
    # testing only: a quiet tone whose length follows the text length
    seconds = max(1.5, len(text) * 0.06)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"sine=f=220:d={seconds}", "-af", "volume=0.05", out_path],
        check=True,
    )


ENGINES = {"edge": tts_edge, "gtts": tts_gtts, "fake": tts_fake}


def make_voice(text, voice, rate, out_path):
    """Returns the engine name that worked, or None."""
    for name in TTS_ORDER:
        fn = ENGINES.get(name)
        if not fn:
            continue
        for attempt in (1, 2):
            try:
                if os.path.exists(out_path):
                    os.remove(out_path)
                fn(text, voice, rate, out_path)
                if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
                    audio_seconds(out_path)
                    return name
                raise RuntimeError("audio file is empty")
            except Exception as exc:  # noqa: BLE001
                log(f"  voice engine '{name}' attempt {attempt} failed: {type(exc).__name__}: {exc}")
                time.sleep(2)
    return None


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

    # ----- voice -----
    log("== Voice-over ==")
    voice_engine = None
    voiced = []
    for i, (kind, text, label) in enumerate(plan):
        rel = f"audio/scene_{i}.mp3"
        full = os.path.join("public", rel)
        engine = make_voice(text, voice, rate, full)
        if not engine:
            voiced = None
            break
        voice_engine = voice_engine or engine
        voiced.append((rel, audio_seconds(full)))
    if voiced is None:
        log("WARNING: voice-over failed for every engine. The video will be silent.")
        for fname in os.listdir("public/audio"):
            if fname != ".gitkeep":
                os.remove(os.path.join("public/audio", fname))
    else:
        log(f"voice engine used: {voice_engine}")

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
        if voiced:
            rel, seconds = voiced[i]
            audio_rel = rel
        else:
            audio_rel = None
            seconds = min(9.0, max(2.8, len(text) * 0.075))
        pad = 1.4 if kind == "cta" else 0.5
        frames = int(math.ceil((seconds + pad) * FPS))
        scenes.append(
            {"kind": kind, "text": text, "label": label, "audio": audio_rel, "image": images[i], "frames": frames}
        )

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
