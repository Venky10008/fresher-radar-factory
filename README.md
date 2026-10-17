# Fresher Radar video factory

Makes a 9:16 reel (Telugu voice-over + animated text) from a JSON job. Runs on GitHub Actions, free on a public repo.

## First test
1. Push these files to a PUBLIC GitHub repo.
2. Open the repo > Actions > "Render reel" > Run workflow.
3. Paste the content of sample-job.json into the "job" box. Run.
4. When the run turns green, open it and download the "reel" artifact (reel.mp4).

## Job JSON fields
category (ai_tools, govt_jobs, private_jobs, internships, certificates, career_boost), tool_name, pricing,
hook_te, summary_te, for_students_te. Optional: cta_te, voice (te-IN-ShrutiNeural or te-IN-MohanNeural), rate.

## Notes
- If the voice-over service fails, the video is still rendered silent.
- Later, n8n can start this workflow through the GitHub API (workflow_dispatch).
