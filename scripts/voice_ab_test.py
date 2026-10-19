"""Voice A/B test: edge-tts variants vs Piper (te_IN-padmavathi-medium).

Creates one MP3 per text/variant in out/voice_test/:
  edge_v1:         te-IN-ShrutiNeural, rate +0%, pitch +0Hz
  edge_v2:         te-IN-ShrutiNeural, rate -8%, pitch +0Hz
  edge_v3:         te-IN-ShrutiNeural, rate -5%, pitch +3Hz
  edge_v4:         te-IN-MohanNeural,  rate -5%, pitch +0Hz
  edge_v0_current: current production pipeline (scripts/make_assets.py phrase
                   splitting + gaps + loudnorm), for comparison
  piper_padmavathi: Piper te_IN-padmavathi-medium (CC-BY-4.0, credit required)

Each edge variant is ONE edge-tts call for the whole text (no phrase splitting,
no inserted silence, no atempo). The texts are sent exactly as written
(ZWNJ U+200C kept). Every file is then trimmed (leading/trailing silence) and
loudnorm=I=-16:TP=-1.5:LRA=11, exported to MP3.

This script only imports scripts/make_assets.py; it does not modify it and
does not change any production defaults. Audio output lives under out/, which
is git-ignored.
"""
import asyncio
import subprocess
import sys
import time
import urllib.request
import wave
from importlib.metadata import version as pkg_version
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent))
import make_assets as ma  # noqa: E402  production pipeline, imported read-only

TEXT_A = "ఎగ్జామ్ ముందు పీడీఎఫ్ చదవడం కష్టమా? ఈ ఫ్రీ టూల్ ట్రై చేయండి."
TEXT_B = "నోట్\u200cబుక్ ఎల్ఎమ్ గూగుల్ ఇచ్చే ఫ్రీ ఏఐ టూల్. క్విజ్, ఫ్లాష్\u200cకార్డ్స్, పాడ్\u200cకాస్ట్ స్టైల్ ఆడియో కూడా చేస్తుంది."
TEXT_C = "రోజూ ఇలాంటి ఏఐ టూల్స్ అప్\u200cడేట్స్ కోసం, బయో లో ఉన్న ఫ్రెషర్ రాడార్ గ్రూప్ లో జాయిన్ అవ్వండి."

TEXTS = [("A", TEXT_A), ("B", TEXT_B), ("C", TEXT_C)]

EDGE_VARIANTS = [
    ("edge_v1", "te-IN-ShrutiNeural", "+0%", "+0Hz"),
    ("edge_v2", "te-IN-ShrutiNeural", "-8%", "+0Hz"),
    ("edge_v3", "te-IN-ShrutiNeural", "-5%", "+3Hz"),
    ("edge_v4", "te-IN-MohanNeural", "-5%", "+0Hz"),
]

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out" / "voice_test"
RAW_DIR = OUT_DIR / "_raw"
MODEL_DIR = OUT_DIR / "_models"
PIPER_NAME = "te_IN-padmavathi-medium"
PIPER_ONNX = MODEL_DIR / f"{PIPER_NAME}.onnx"
MODEL_CARD = MODEL_DIR / "MODEL_CARD"
HF_DIR = "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/padmavathi/medium"

TRIM_AND_NORM = (
    "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,"
    "areverse,"
    "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,"
    "areverse,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)


def synth_edge(text, voice, rate, pitch, out_path, attempts=3):
    """One edge-tts call for the whole text; returns wall seconds."""
    import edge_tts

    async def run():
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        with open(out_path, "wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])

    last = None
    for i in range(1, attempts + 1):
        t0 = time.perf_counter()
        try:
            asyncio.run(run())
            if out_path.exists() and out_path.stat().st_size > 1000:
                return time.perf_counter() - t0
            raise RuntimeError("empty audio file")
        except Exception as exc:  # noqa: BLE001
            last = exc
            print(f"    edge attempt {i} failed: {type(exc).__name__}: {exc}")
            time.sleep(2)
    raise RuntimeError(f"edge-tts failed for {voice}: {last}")


def synth_edge_v0_current(text, out_path):
    """Same text through the current pipeline (split_phrases + gaps + loudnorm)."""
    tts_text = ma.normalize_te(text)
    assert tts_text == text, "pure Telugu input must pass normalize_te unchanged"
    t0 = time.perf_counter()
    synth = ma.synth_phrases(tts_text, ma.VOICE_DEFAULT, ma.RATE_DEFAULT)
    if synth is None:
        raise RuntimeError("current pipeline synth_phrases returned None")
    result = ma.finalize_scene(synth, str(out_path))
    if result is None:
        raise RuntimeError("current pipeline finalize_scene returned None")
    return time.perf_counter() - t0, synth["engine"]


def ensure_piper_files():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name in (f"{PIPER_NAME}.onnx", f"{PIPER_NAME}.onnx.json", "MODEL_CARD"):
        dest = MODEL_DIR / name
        if not dest.exists() or dest.stat().st_size == 0:
            print(f"  downloading {name} ...")
            urllib.request.urlretrieve(f"{HF_DIR}/{name}", dest)
        print(f"  {name}: {dest.stat().st_size} bytes")
    lines = MODEL_CARD.read_text(encoding="utf-8").splitlines()
    licence = next(
        (line.strip() for line in lines if "license" in line.lower()),
        "not found",
    )
    print(f"  MODEL_CARD licence line: {licence}")


def piper_checks(voice):
    print("  Piper capability checks:")
    data_dir = Path(str(voice.espeak_data_dir))
    if data_dir.is_dir():
        n_files = sum(1 for _ in data_dir.rglob("*"))
        print(f"    espeak-ng data: BUNDLED at {data_dir} ({n_files} files)")
    else:
        print(f"    espeak-ng data: MISSING (looked at {data_dir})")

    zwnj = "\u200c"
    try:
        chunks = list(voice.synthesize(f"నోట్{zwnj}బుక్"))
        phonemes = sum(len(c.phonemes) for c in chunks)
        print(f"    ZWNJ probe (U+200C in Telugu text): OK, no error ({phonemes} phonemes)")
    except Exception as exc:  # noqa: BLE001
        print(f"    ZWNJ probe (U+200C in Telugu text): FAILED: {type(exc).__name__}: {exc}")

    try:
        chunks = list(voice.synthesize("నమస్తే", include_alignments=True))
        have_align = any(c.phoneme_alignments for c in chunks)
        have_samples = any(c.phoneme_id_samples is not None for c in chunks)
        if have_align:
            print("    word/phoneme timings: YES (phoneme_alignments returned)")
        elif have_samples:
            print("    word/phoneme timings: PARTIAL (phoneme_id_samples only)")
        else:
            print(
                "    word/phoneme timings: NO for this voice - include_alignments=True "
                "returned phoneme_alignments=None and phoneme_id_samples=None (model has "
                "no alignment data); `python -m piper --help` has no timing/json flags"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"    timings probe failed: {type(exc).__name__}: {exc}")


def synth_piper(voice, text, out_wav):
    """Piper Python API, with the CLI as a fallback; returns wall seconds."""
    t0 = time.perf_counter()
    try:
        with wave.open(str(out_wav), "wb") as wav_file:
            voice.synthesize_wav(text, wav_file)
    except (AttributeError, TypeError):
        subprocess.run(
            [sys.executable, "-m", "piper", "-m", str(PIPER_ONNX), "-f", str(out_wav)],
            input=text.encode("utf-8"),
            check=True,
        )
    if not out_wav.exists() or out_wav.stat().st_size < 1000:
        raise RuntimeError("piper produced no audio")
    return time.perf_counter() - t0


def postprocess(src, dst):
    """Trim leading/trailing silence, then loudnorm, export mp3."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
            "-af", TRIM_AND_NORM,
            "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", str(dst),
        ],
        check=True,
    )


def ffprobe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def max_volume(path):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    for line in out.stderr.splitlines():
        if "max_volume:" in line:
            return float(line.split("max_volume:")[1].strip().split()[0])
    return None


def count_silences(path, noise_db=-45, min_dur=0.15):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path),
         "-af", f"silencedetect=noise={noise_db}dB:d={min_dur}",
         "-f", "null", "-"],
        capture_output=True, text=True,
    )
    return sum(1 for line in out.stderr.splitlines() if "silence_start:" in line)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output folder: {OUT_DIR.resolve()}")
    print(f"edge-tts version: {pkg_version('edge-tts')}")

    results = []

    print("\n== STEP 1: edge-tts variants (one call per whole text) ==")
    zwnj = "\u200c"
    for tkey, text in TEXTS:
        print(f"TEXT_{tkey}: ZWNJ count={text.count(zwnj)}")
        for variant, voice, rate, pitch in EDGE_VARIANTS:
            raw = RAW_DIR / f"TEXT_{tkey}_{variant}.mp3"
            dt = synth_edge(text, voice, rate, pitch, raw)
            print(f"  TEXT_{tkey} {variant}: {voice} rate={rate} pitch={pitch} -> {dt:.2f}s")
            results.append((tkey, variant, raw, dt))
        raw = RAW_DIR / f"TEXT_{tkey}_edge_v0_current.mp3"
        dt, engine = synth_edge_v0_current(text, raw)
        note = "" if engine == "edge" else "  WARNING: engine is not edge!"
        print(f"  TEXT_{tkey} edge_v0_current: current pipeline (engine={engine}) -> {dt:.2f}s{note}")
        results.append((tkey, "edge_v0_current", raw, dt))

    print("\n== STEP 2: Piper te_IN-padmavathi-medium ==")
    print(f"piper-tts version: {pkg_version('piper-tts')}")
    ensure_piper_files()
    from piper import PiperVoice

    voice = PiperVoice.load(str(PIPER_ONNX))
    print(f"  voice loaded: sample_rate={voice.config.sample_rate}")
    piper_checks(voice)
    for tkey, text in TEXTS:
        raw = RAW_DIR / f"TEXT_{tkey}_piper_padmavathi.wav"
        dt = synth_piper(voice, text, raw)
        print(f"  TEXT_{tkey} piper_padmavathi: {dt:.2f}s")
        results.append((tkey, "piper_padmavathi", raw, dt))

    print("\n== STEP 3: trim + loudnorm=I=-16:TP=-1.5:LRA=11, export mp3 ==")
    finals = []
    for tkey, variant, raw, dt in results:
        dst = OUT_DIR / f"TEXT_{tkey}_{variant}.mp3"
        postprocess(raw, dst)
        finals.append((tkey, variant, dst, dt))
        print(f"  {dst.name}: {dst.stat().st_size} bytes")

    print("\n== STEP 4: measurements ==")
    print(f"{'file':<34} {'duration':>9} {'sil>0.15s':>9} {'max_volume':>10} {'synth_s':>8}")
    for tkey, variant, path, dt in finals:
        dur = ffprobe_duration(path)
        sil = count_silences(path)
        mv = max_volume(path)
        mv_txt = f"{mv:.1f} dB" if mv is not None else "n/a"
        print(f"{path.name:<34} {dur:>8.2f}s {sil:>9} {mv_txt:>10} {dt:>7.2f}s")

    print(f"\nFolder: {OUT_DIR.resolve()}")
    print("Files:")
    for f in sorted(OUT_DIR.glob("TEXT_*_*.mp3")):
        print(f"  {f.name}")


if __name__ == "__main__":
    main()
