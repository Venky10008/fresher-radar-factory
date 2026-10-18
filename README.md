# Fresher Radar video factory

Makes a 9:16 reel from a JSON job: Telugu voice-over, a picture for every scene, soft music,
a look that changes with the category, and a layout that changes from video to video.
Runs on GitHub Actions (free on a public repo).

## Run it
Actions > "Render reel" > Run workflow > paste the content of sample-job.json > Run.
When it turns green, open the run and download the artifact "reel": reel.mp4 and build-log.txt.
build-log.txt says whether the voice and the pictures worked.

## Pictures (optional but recommended)
Add two repository secrets (Settings > Secrets and variables > Actions):
CF_ACCOUNT_ID and CF_API_TOKEN (Cloudflare Workers AI). Without them the factory tries Pollinations,
and if that fails too it draws a motion graphic instead of a picture.

## Job JSON
category: ai_tools, govt_jobs, private_jobs, internships, certificates, career_boost
tool_name, pricing, hook_te, summary_te, for_students_te
image_prompts: 3 short English picture descriptions (no real people, no brand logos, no text in the picture)
Optional: cta_te, voice (te-IN-ShrutiNeural or te-IN-MohanNeural), rate, music (true or false)
