# PROJECT_STATE

## Claude #2 / local AI — T1 + T2

### What changed (`scripts/make_assets.py` only)

**TASK 1 — Use new voice fields:**
- `image_prompts` now accepts a JSON STRING (parsed with `json.loads`) or a real list. Previously it only accepted a list, so a JSON string would be iterated character-by-character.
- Voice text selection: `voice_hook_te`/`voice_summary_te`/`voice_students_te` used directly when present (no dictionary applied). Falls back to `normalize_te()` + `TELUGU_WORDS` only when the field is empty.
- On-screen `text` in `props.json` still comes from `hook_te`/`summary_te`/`for_students_te` (unchanged).

**TASK 2 — Voice consistency:**
- `check_clipping(path)` added: runs `ffmpeg volumedetect` on each finalized TTS clip and reports `max_volume` in dB.
- Clipping status logged per scene: `max_volume=X.X dB (OK)` or `(CLIPPING!)` or `(unknown)`.
- All clips already use `loudnorm=I=-16:TP=-1.5:LRA=11` (was pre-existing) and rate `+0%` (pre-existing).

### What was verified

Ran `make_assets.py` with the Task 3 sample job (Sphinx, 6 scenes):

| Scene | Kind | Voice text used | Image prompt used | Picture source | max_volume |
|-------|------|----------------|-------------------|----------------|------------|
| 0 | hook | `voice_hook_te` (pure Telugu) | `image_prompts[0]` | pollinations | -2.5 dB (OK) |
| 1 | line | `voice_summary_te`[0] (pure Telugu) | `image_prompts[1]` | pollinations | -1.9 dB (OK) |
| 2 | line | `voice_summary_te`[1] (pure Telugu) | `image_prompts[2]` | pollinations failed (402) → motion graphic | -2.0 dB (OK) |
| 3 | line | `voice_summary_te`[2] (pure Telugu) | `image_prompts[0]` (wrapped) | pollinations failed (402) → motion graphic | -2.8 dB (OK) |
| 4 | students | `voice_students_te` (pure Telugu) | `image_prompts[1]` (wrapped) | pollinations failed (402) → motion graphic | -1.9 dB (OK) |
| 5 | cta | dictionary fallback (no `voice_cta_te`) | none (cta) | none | -1.9 dB (OK) |

- All 6 voice scenes use pure Telugu script for TTS (voice_*_te fields where available).
- No Latin text reaches TTS from voice_*_te fields.
- On-screen text uses `hook_te`/`summary_te`/`for_students_te` (confirmed in `public/props.json`).
- All max_volume values below 0 dB → no clipping.
- edge-tts engine used for all clips; word-boundary timings present in props.json.

### Fix — Uneven voice speed (atempo removed, short scenes merged)

- Removed per-clip `atempo` time-stretching from `finalize_scene()` — every clip now plays at natural TTS speed (atempo=1.0).
- Added scene merging: any scene with fewer than 3 spoken words is merged with the next scene, preserving full-stop pauses between phrases.
- Silence padding is NOT used — scene length is determined by audio duration + existing pad, so no stretching is ever needed.
- `loudnorm` and `check_clipping` unchanged.

Verified with Sphinx sample job: 5 scenes after merging, all atempo=1.000, CPS 8.7–12.8 (within ±20%), no scene < 3 words, no clipping.

### What is still open

- Cloudflare FLUX not tested (no `CF_ACCOUNT_ID`/`CF_API_TOKEN` set).
- Pollinations returns HTTP 402 (Payment Required) after a couple of successful calls — motion graphics used as fallback.
- `job.json` test file created locally (gitignored, not committed).
- `src/` and `src-v2/` templates were NOT touched (per instructions).
- Real MP4 render / Remotion still not re-run after these changes.
