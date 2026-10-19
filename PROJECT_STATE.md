# PROJECT_STATE

## Latest fix
- Fixed SyntaxError at line 422 in scripts/make_assets.py (orphan fragment removed).
- Simplified normalize_te to one Latin-word-only version; Telugu text and ZWNJ untouched.
- Removed unused Telugu grapheme helpers and the unused unicodedata import.
- music is on ("music": true in job.json).
- GitHub Action now runs python -m py_compile scripts/make_assets.py first.

## Sphinx sample job - 5 fixes applied (scripts/make_assets.py)

### FIX 1 - Telugu ZWNJ text corruption protection
- normalize_te() rewritten to split on whitespace only; Telugu combining marks preserved.
- NFC applied only if it doesn't change the string; ZWNJ kept intact.

### FIX 2 - Garbled text inside AI pictures
- _sanitize_prompt() strips Telugu-script runs in image prompts.
- _TELUGU_RE pattern matches Telugu range and ZWNJ.

### FIX 3 - Repeated pictures
- _unique_prompts() yields unique prompts per scene.
- Scene-specific suffix: scene {i + 1} of {n}.

### FIX 4 - Background music is off
- make_music() enforces safe_seconds = max(seconds, 5.0).
- Music pad created via ffmpeg, target -28 dB under voice.

### FIX 5 - Too much dead air
- PHRASE_GAP = 0.25 (was 0.42).
- finalize_scene() uses PHRASE_GAP.

### Verification summary
- Ran make_assets.py with Sphinx sample job.
- All fixes verified in scripts/make_assets.py.

### What is still open
- Cloudflare FLUX not tested.
- Pollinations returns HTTP 402 - motion graphics used as fallback.
- src/ and src-v2/ templates were NOT touched.
- Real MP4 render not re-run.
