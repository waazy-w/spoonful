# Demo video script

> **A finished video already exists:** `docs/spoonful-demo.mp4` (2:19, 1280×720, narrated, captions burned in; `spoonful-demo.srt` has the captions for YouTube). It was recorded automatically by `docs/video/record-demo.js` from the narration in `docs/video/scenes.json`.
> Want your own voice? Record over it using the plan below. A human voice usually lands better with judges.

**Setup before recording:** open the deployed site in a clean browser profile (or Settings → Delete everything), at 1280×800 and 125% zoom. Turn on a screen reader (NVDA on Windows / VoiceOver on Mac) only for scene 6. Record with OBS or Loom, and add captions (YouTube auto-captions, then fix them, because the video itself should be accessible).

| Time | On screen | Voice-over |
|---|---|---|
| 0:00–0:15 | Title card: "Spoonful: plan by energy, not by hours" | "Every to-do app assumes you have the same energy every day. For students with chronic illness, ADHD or depression, that's not true. On a bad day the list doesn't shrink. It just turns into guilt." |
| 0:15–0:30 | Empty Today screen | "Spoonful is built on spoon theory: you get a limited number of spoons each day, and every task costs some. So Spoonful starts with one question: how much energy do you have right now?" |
| 0:30–0:55 | Click **Try it with example tasks**, then select **Great (10)**. Scroll the plan | "Here's a typical student week. On a great day, Spoonful plans the must-dos and deadlines first: the doctor's appointment, the email due today, and even the big lab report. And it **always keeps one spoon in reserve**." |
| 0:55–1:20 | Switch to **Low (4)**. Pause on "Not today, and that's okay" | "Same list, rough day. Now only two things fit. Everything else is still here, with a reason. *Your energy is already spoken for. This can wait.* No red overdue badges, no shame." |
| 1:20–1:45 | Click **Break it down** on the lab report, then **Add all suggestions**. Go back to Today and select **Okay (6)** | "The lab report is due tomorrow, but 5 spoons will never fit a low day. So we break it down with built-in suggestions that work offline. Now Spoonful plans *just the first step* today. The deadline still moves forward." |
| 1:45–2:10 | **Start Focus mode**. Click Done, then Not now, then Read aloud. Start the gentle timer | "Focus mode shows one thing at a time. Done, not now, or too big. It can read each step aloud, and the timer counts up, never down." |
| 2:10–2:25 | Settings: Large text, Readable spacing, High contrast, Dark. Then keyboard-Tab through Today with the screen reader on for about 5 seconds | "Accessibility is built in: text size, dyslexia-friendly spacing, high contrast, full keyboard and screen-reader support. Our automated WCAG audit finds zero violations." |
| 2:25–2:40 | Terminal: `npm test` showing 16 passing; then the README | "The planner is a pure, tested engine: 16 unit tests plus a browser accessibility test. There's no server and no account, and it works offline. Your health data stays on your device." |
| 2:40–2:50 | Closing card + URL | "Spoonful. Plan by energy, not by hours. Try it at [URL]." |

**Tips**
- Keep the cursor slow and zoom in on the "Not today" reasons. That moment is the emotional core of the pitch.
- Show the **same list** on a Great vs a Low day back to back. That's the "meaningful change" the brief asks for.
- Don't claim user testing you didn't do. If you ran sessions with real users, add a 10-second quote in place of 2:25–2:40.
