# Taskforge — 10 ideas scored against the rubric

**Brief:** "Choose a user. Name one productivity or access barrier. Show a meaningful change."
**Judged on:** Impact (usefulness + positive impact) and Technical Execution (listed twice on the Devpost page, so it likely counts double), plus accessibility, originality and presentation from the rules.

Each idea is scored 1–5 per criterion. Technical Execution is weighted ×2 to match the page. "Feasible" means it can be built well and polished by **Oct 24, 2026, 5:00pm EDT**.

| # | Idea | User + barrier | Impact | Tech ×2 | Access. | Original | Present. | Feasible | **Total /35** |
|---|------|----------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | **Spoonful**: energy-budget day planner | Students with chronic illness, ADHD or depression. To-do apps assume you have unlimited energy every day | 5 | 5 (10) | 5 | 4 | 5 | 5 | **34** |
| 2 | Next Tiny Step: AI task breaker | ADHD students frozen by vague tasks | 4 | 3 (6) | 4 | 2 (Goblin Tools already does this) | 4 | 5 | 25 |
| 3 | Picture Routine: visual step-by-step routines with TTS | Autistic or intellectually disabled young adults | 5 | 4 (8) | 5 | 3 | 4 | 4 | 29 |
| 4 | Caption-to-Actions: live captions to action items | Deaf/HoH students in group meetings | 5 | 2 (4) (speech APIs are unreliable live) | 4 | 4 | 4 | 2 | 23 |
| 5 | Keyboard-first Kanban for screen readers | Blind/low-vision project teammates | 4 | 3 (6) | 5 | 3 | 3 | 3 | 24 |
| 6 | Voice-only task capture | Users with motor impairments | 4 | 3 (6) | 5 | 2 | 3 | 4 | 24 |
| 7 | Syllabus Backward Planner | First-gen students who get surprised by deadlines | 4 | 3 (6) | 3 | 3 | 4 | 3 (PDF parsing is fragile) | 23 |
| 8 | Baton: structured group-project handoffs | Student teams losing context between members | 3 | 4 (8) | 3 | 4 | 3 | 4 | 25 |
| 9 | Calm Body-Double focus room | Students who can't start alone | 3 | 2 (4) (realtime needs a backend) | 3 | 3 | 4 | 2 | 19 |
| 10 | Plain-Language Instructions rewriter | ESL / dyslexic students facing dense assignment briefs | 4 | 3 (6) | 4 | 2 | 4 | 4 | 24 |

## Winner: #1 Spoonful

**Why it wins on this rubric**

- **Impact.** It names a specific user (a student with a chronic illness or an energy-limiting condition) and a barrier that mainstream productivity tools ignore: they plan in hours, but this user's real constraint is energy, and it changes every day. The change is concrete. The user goes from an overwhelming list plus guilt to "here is what fits today, here is what can wait, and that's OK."
- **Technical Execution (double weight).** It has no backend and no API keys, so nothing can break in judging. The planning engine is pure, deterministic and **unit-tested**. The app is an installable PWA that works offline. Judges can open one link and it works.
- **Accessibility is a feature, not an afterthought.** It has full keyboard use, screen-reader announcements, adjustable text size, a readable-spacing mode, high contrast, reduced motion, and read-aloud in Focus mode.
- **Originality.** "Spoon theory" is well known in the disability community, but few tools put it into practice. An energy-budgeted planner that **explains why** each task was deferred is uncommon.
- **Presentation.** The before/after is easy to show: the same task list, a "good day" plan vs a "rough day" plan, in 2 minutes.

**Close runner-up:** #3 Picture Routine. The impact is just as strong, but it needs image assets and user testing that are hard to do honestly in 5 days.
