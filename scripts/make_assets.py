"""
Reads the job JSON, makes a Telugu voice-over for every scene (edge-tts),
measures each audio length, and writes public/props.json for Remotion.
If voice-over fails for any reason, the video is still made (silent) so the run never dies.
"""
import asyncio
import json
import math
import os
import re
import subprocess
import sys

FPS = 30
VOICE_DEFAULT = "te-IN-ShrutiNeural"  # other Telugu voice: te-IN-MohanNeural
RATE_DEFAULT = "+8%"
CTA_DEFAULT = "రోజూ ఇలాంటి AI tools updates కోసం, bio లో ఉన్న Fresher Radar group లో join అవ్వండి."

CATEGORY_LABELS = {
    "ai_tools": "AI tools",
    "govt_jobs": "Govt jobs",
    "private_jobs": "Private jobs",
    "internships": "Internships",
    "certificates": "Certificates",
    "career_boost": "Career boost",
}


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
    # keep at most 3 lines on screen: merge extra sentences into the last one
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


async def speak(text, voice, rate, out_path):
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(out_path)


def main():
    job = load_job()
    voice = job.get("voice") or VOICE_DEFAULT
    rate = job.get("rate") or RATE_DEFAULT
    os.makedirs("public/audio", exist_ok=True)

    scenes_in = []
    if job.get("hook_te"):
        scenes_in.append(("hook", job["hook_te"].strip()))
    for line in split_sentences(job.get("summary_te", "")):
        scenes_in.append(("line", line))
    if job.get("for_students_te"):
        scenes_in.append(("students", job["for_students_te"].strip()))
    scenes_in.append(("cta", (job.get("cta_te") or CTA_DEFAULT).strip()))

    if len(scenes_in) < 2:
        print("ERROR: job needs at least hook_te or summary_te", file=sys.stderr)
        sys.exit(1)

    voice_ok = True
    scenes_out = []
    for i, (kind, text) in enumerate(scenes_in):
        audio_rel = None
        seconds = None
        if voice_ok:
            rel = f"audio/scene_{i}.mp3"
            full = os.path.join("public", rel)
            try:
                asyncio.run(speak(text, voice, rate, full))
                seconds = audio_seconds(full)
                audio_rel = rel
            except Exception as exc:  # noqa: BLE001
                print(f"WARNING: voice-over failed ({exc}). Making a silent video.", file=sys.stderr)
                voice_ok = False
                audio_rel = None
                seconds = None
                for k in range(i + 1):
                    p = os.path.join("public", f"audio/scene_{k}.mp3")
                    if os.path.exists(p):
                        os.remove(p)
                for s in scenes_out:
                    s["audio"] = None
        if seconds is None:
            # silent fallback: about 0.075 s per character, between 2.5 and 9 seconds
            seconds = min(9.0, max(2.5, len(text) * 0.075))
        pad = 1.2 if kind == "cta" else 0.45
        frames = int(math.ceil((seconds + pad) * FPS))
        scenes_out.append({"kind": kind, "text": text, "audio": audio_rel, "frames": frames})

    if not voice_ok:
        # recompute durations for silent mode so scenes are not cut short or too long
        for s in scenes_out:
            s["audio"] = None

    props = {
        "brand": job.get("brand") or "Fresher Radar",
        "categoryLabel": CATEGORY_LABELS.get(job.get("category", "ai_tools"), job.get("category", "")),
        "toolName": job.get("tool_name") or "",
        "pricing": job.get("pricing") or "",
        "scenes": scenes_out,
    }
    with open("public/props.json", "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False, indent=2)

    total = sum(s["frames"] for s in scenes_out) / FPS
    print(f"OK: {len(scenes_out)} scenes, about {total:.1f} seconds, voice={'on' if voice_ok else 'OFF (silent)'}")


if __name__ == "__main__":
    main()
