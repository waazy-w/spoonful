# Taskforge submission checklist

**Deadline: Fri Oct 24, 2026, 5:00 PM EDT.** Aim to submit by Oct 23 so there's time for fixes.

## Required by the hackathon
- [ ] Registered on taskforge.devpost.com (it's student-only, so have your student status ready)
- [ ] **Working original prototype**: done (this repo)
- [x] **Code**: https://github.com/waazy-w/spoonful (public, 6 commits, README with run instructions)
- [x] **Live demo**: https://waazy-w.github.io/spoonful/ (verified: loads, plans, works offline, no errors)
- [x] **Demo video**: `docs/spoonful-demo.mp4` (2:19, narrated, captions burned in)
- [ ] Upload it to YouTube (unlisted is fine), add `docs/spoonful-demo.srt` as subtitles, and paste the link into Devpost
- [ ] **Project story**: paste from `docs/DEVPOST_SUBMISSION.md` and fill every `[BRACKET]`
- [ ] **Problem, user, solution, tools, limitations, what you learned**: all sections are in the write-up
- [x] **AI assistance + pre-existing work**: disclosure written; check that it matches what you actually did
- [ ] **All team members** added to the Devpost project
- [ ] Only use examples you have permission to share (the sample tasks are fictional; Maya is a composite persona)

## Watch out
- [ ] The rules say "projects must be created during the event period", and the page lists the period as "October 24 at 5:00pm EDT to deadline", which looks like a typo. Email the hackathon manager (link on the Devpost page) to confirm the start date, and commit your work with honest timestamps.
- [ ] Commit history: make several real commits as you go (judges look at this for Technical Execution)

## Strongly recommended (raises your Impact score)
- [ ] Test with 2–3 real people (classmates, a disability-services contact). Ask: "Did the plan feel realistic? Did the 'Not today' reasons feel kind?" Add one line to the write-up.
- [ ] Run one real screen-reader pass (NVDA is free on Windows) and note it in the write-up.
- [ ] Add the 6 screenshots in `docs/screenshots/` to the Devpost gallery; use `1-low-energy-day.png` as the thumbnail.

## Pre-submit smoke test
- [ ] `npm test` → 16 passing
- [ ] Open the live URL → "Try it with example tasks" → Low → Break it down → Focus → Done
- [ ] Reload: are the tasks still there?
- [ ] Turn on airplane mode and reload the live URL: does it still load (offline)?
