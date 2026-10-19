"""Listening test for edge-tts voice profiles (single vs mix).

Uses the pipeline functions from scripts/make_assets.py (imported, not copied):
profile_for_scene() + synth_scene() + finalize_scene().
Writes 6 MP3s to out/voice_test/: profile_<preset>_TEXT_<A|B|C>.mp3
A=hook, B=line, C=cta. out/ is git-ignored; audio is not committed.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import make_assets as ma  # noqa: E402

TEXT_A = "ఎగ్జామ్ ముందు పీడీఎఫ్ చదవడం కష్టమా? ఈ ఫ్రీ టూల్ ట్రై చేయండి."
TEXT_B = "నోట్\u200cబుక్ ఎల్ఎమ్ గూగుల్ ఇచ్చే ఫ్రీ ఏఐ టూల్. క్విజ్, ఫ్లాష్\u200cకార్డ్స్, పాడ్\u200cకాస్ట్ స్టైల్ ఆడియో కూడా చేస్తుంది."
TEXT_C = "రోజూ ఇలాంటి ఏఐ టూల్స్ అప్\u200cడేట్స్ కోసం, బయో లో ఉన్న ఫ్రెషర్ రాడార్ గ్రూప్ లో జాయిన్ అవ్వండి."

ITEMS = [("A", TEXT_A, "hook"), ("B", TEXT_B, "line"), ("C", TEXT_C, "cta")]
PRESETS = ("single", "mix")


def main():
    out_dir = Path(ma.__file__).resolve().parents[1] / "out" / "voice_test"
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output folder: {out_dir.resolve()}")

    for preset in PRESETS:
        print(f"\npreset={preset}")
        for key, text, kind in ITEMS:
            settings = ma.profile_for_scene(kind, preset)
            synth = ma.synth_scene(text, settings["voice"], settings["rate"], settings["pitch"])
            if synth is None:
                raise SystemExit(f"voice synthesis failed for {preset} TEXT_{key}")
            dst = out_dir / f"profile_{preset}_TEXT_{key}.mp3"
            result = ma.finalize_scene(synth, str(dst))
            if result is None:
                raise SystemExit(f"finalize failed for {preset} TEXT_{key}")
            print(
                f"  TEXT_{key} kind={kind} voice={settings['voice']} "
                f"rate={settings['rate']} pitch={settings['pitch']} "
                f"duration={result['seconds']:.2f}s engine={synth['engine']} -> {dst.name}"
            )

    print(f"\nFolder: {out_dir.resolve()}")
    print("Files:")
    for f in sorted(out_dir.glob("profile_*_TEXT_*.mp3")):
        print(f"  {f.name}")


if __name__ == "__main__":
    main()
