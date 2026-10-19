# Devpost submission: copy-paste ready

> Fill in the `[BRACKETS]` before submitting. Every section the brief asks for is covered: problem, intended user, solution, tools, limitations, what you learned, pre-existing work, AI assistance.

---

**Project name:** Spoonful

**Tagline (≤ 60 chars):** Plan your day by energy, not by hours.

**Built with (tags):** `javascript` `html5` `css3` `pwa` `service-worker` `localstorage` `web-speech-api` `node.js` `axe-core` `accessibility`

**Links:**
- Try it: `[GITHUB PAGES URL]`
- Code: `[GITHUB REPO URL]`
- Video: `[YOUTUBE / VIMEO URL]`

**Image gallery (in this order):** `docs/screenshots/1-low-energy-day.png`, `2-great-day.png`, `3-break-it-down.png`, `4-focus-mode.png`, `5-high-contrast-large-text.png`, `6-mobile.png`

---

## Inspiration

Picture Maya, a second-year student with long COVID. (Maya is a composite persona; see "Who we built for" below.) On a good day she can manage a lecture, a lab write-up and laundry. On a bad day, replying to one email uses up everything she has. Her to-do app doesn't know the difference. It shows the same 12 items every morning, and every evening it shows her how many she "failed".

Disabled and chronically ill people already have a language for this: **spoon theory**. You start each day with a limited number of spoons, and every task costs some. Plenty of people *talk* about spoons. We couldn't find a planner that actually *plans* with them, so we built one.

## Who we built for

**User:** a student with an energy-limiting condition (chronic illness, ADHD, depression, chronic pain) whose capacity changes from day to day.

**Barrier:** productivity tools measure time, not energy. They assume every day is the same, which leaves these students with plans they can't keep and a list that feels like a judgement.

**Meaningful change:** the student goes from an overwhelming list plus guilt to a plan that fits today's real energy, a clear first step, and a written reason that it's okay for the rest to wait.

> `[If you test with real people before submitting, add one line here, e.g. "We tested with 3 classmates; 2 said the 'Not today' reasons felt kinder than their current app." Only include feedback you have permission to share.]`

## What it does

1. **Check in.** "How much energy do you have right now?" Pick *Running on empty / Low / Okay / Good / Great*, or set an exact number of spoons.
2. **Add tasks with an energy cost** from Tiny (1) to Huge (5), plus an optional due date and a "must happen today" flag.
3. **Get a plan that fits.** Must-dos and near deadlines come first, then the smallest tasks. One spoon is always **held in reserve** so the plan never spends you to zero.
4. **"Not today, and that's okay."** Every deferred task says *why*: no room today, rest day, or too big. Too-big tasks get a **Break it down** button.
5. **Break it down.** Built-in suggestions (offline, no AI) turn "Finish lab report" into "Open a blank document and give it a title → Write 3 rough bullet points → …". Spoonful then plans **just the first steps that fit**, so big deadlines still move forward on low days.
6. **Focus mode.** One thing on screen at a time, with **Done**, **Not now**, **Too big?** and **Read aloud**, plus an optional timer that counts *up*, never down.
7. **Done today.** A record of what you achieved, with Undo.

## Accessibility is the feature

- Full keyboard use, a visible focus ring, a skip link, and focus moved deliberately after every action
- Screen-reader announcements through a polite live region ("Done: reply to email. Next: book appointment.")
- Real radio buttons and checkboxes under the card UI, so screen readers announce them correctly. Every icon has a text alternative
- Text size up to 150%, a **readable spacing** mode (wider letter, word and line spacing), **high contrast**, dark mode, reduced motion
- Atkinson Hyperlegible font (designed by the Braille Institute for low-vision readers)
- Minimum 44px touch targets, no information shown by colour alone, works at 390px width
- **axe-core WCAG 2.1 AA audit: 0 violations** in six app states, including dark and high contrast

## How we built it

- **Vanilla HTML, CSS and JavaScript.** No framework, no build step, no backend, no API keys. A judge can open one link and it works, even offline.
- **A pure planning engine** (`js/planner.js`) shared by the browser and the Node tests: greedy, priority-ordered selection with a reserve buffer and partial step planning.
- **16 unit tests** (`node:test`) cover the reserve, budget limits, priority order, partial planning, deferral reasons and date logic.
- **A headless-Chrome end-to-end test** (puppeteer-core) walks the full user journey and runs axe-core in every state.
- **A Progressive Web App:** a service-worker app-shell cache, an installable manifest, and localStorage persistence that resets the check-in each new day.
- **The Web Speech API** for read-aloud in Focus mode.

## Challenges we ran into

- **Making "no" feel kind.** The first version just listed unplanned tasks. We rewrote every deferral as a reason (*"Your energy is already spoken for today. This can wait."*) and labelled very low days as **rest**, not failure.
- **Big tasks never fit.** A 5-spoon lab report due tomorrow would never fit a 4-spoon day, so the planner silently ignored it. Our browser test caught this. We added a "never fits" rule that offers a breakdown, and partial planning so the first steps of a big task get scheduled.
- **The toast covered the buttons.** Our automated test couldn't click "Start Focus" because the notification toast sat on top of it, and real users would have hit the same problem. The fix was `pointer-events: none`, plus hiding the toast from screen readers so announcements weren't read twice.
- **Keeping keyboard focus through re-renders.** Every interactive element has a stable key, so focus returns to the right control after the list redraws.

## Accomplishments we're proud of

- 0 automated accessibility violations across light, dark and high-contrast themes
- A planner that explains its decisions instead of hiding them
- Fully private: no account, no server, and the data never leaves the device

## What we learned

`[Personalise this. Suggested points:]`
- Accessibility is easier when it's designed in from the start. Using real form controls under a custom look gave us screen-reader support almost for free.
- Language is part of the interface. The same algorithm feels supportive or judgemental depending on one sentence.
- Writing the core logic as pure, tested functions let us change the planning rules late in the project with confidence.

## Limitations (honest list)

- Spoon estimates are subjective and self-reported.
- Step suggestions come from keyword templates, not an understanding of the task.
- One device only (no sync yet); backup/restore is manual.
- Automated accessibility testing isn't the same as testing with disabled users. We haven't yet run sessions with screen-reader users or people with chronic illness.

## What's next

- Learn from history: suggest spoon costs based on how a user rated similar past tasks
- Weekly energy patterns ("Mondays are usually low; move heavy tasks to Wednesday")
- Optional encrypted sync, and calendar export for planned items
- Co-design sessions with disability student services

## Pre-existing work & AI disclosure

- **Concept:** "Spoon theory" is Christine Miserandino's (2003). We built on the idea; we did not invent it.
- **Font:** Atkinson Hyperlegible (Braille Institute, SIL Open Font License) via Google Fonts.
- **Testing libraries** (dev only, not shipped): puppeteer-core, axe-core.
- **AI assistance:** `[Be accurate. For example: "We used Claude (Anthropic), through Claude Code, to help brainstorm and score ideas, write and refactor code, write tests, and draft this write-up. We reviewed, ran and tested all of the code ourselves."]`
- All code was written during the hackathon period. No pre-existing project code was used.

## Team

`[Name(s) + Devpost usernames. Every team member must be added to the Devpost project.]`
