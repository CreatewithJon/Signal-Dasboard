# DEMO_SCRIPT.md — Sovereign OS v7.3

> 10-minute live demo flow. Use this for screen recordings, investor walkthroughs, client pitches, and beta user onboarding calls.

_Updated: 2026-06-19 (v7.3 — /beta route added; send /beta link to invited users before first session)_

---

## Demo Setup Checklist (v7.2)

Complete these steps **before** any live demo, screen recording, or Loom walkthrough.

### Step 1 — Export your real data
- [ ] Go to Settings → Data & Storage → **Export All**
- [ ] Save the JSON file somewhere safe (Desktop or Backup folder)
- [ ] Verify the file downloaded successfully

### Step 2 — Enable Demo Mode
- [ ] Go to Settings → Demo & Privacy → **Enable Demo Mode**
- [ ] Page reloads — confirm the red "Demo Mode" badge appears in the bottom-right corner
- [ ] Navigate to `/` — you should see demo projects, tasks, and the WelcomeBanner (if not yet dismissed)
- [ ] Navigate to `/memory` — verify 5 demo memory items are visible
- [ ] Navigate to `/relationships` — verify 4 demo contacts are visible
- [ ] Navigate to `/opportunities` — verify 3 demo opportunities are visible

### Step 3 — Browser setup
- [ ] Browser zoom at 90–100%
- [ ] Hide bookmarks bar (Cmd+Shift+B on Mac)
- [ ] Enable Do Not Disturb / Focus mode (no notification popups)
- [ ] Close all other browser tabs visible in tab bar
- [ ] If screen recording: set desktop background to dark solid color

### Step 4 — Optional polish
- [ ] Run `npm run build && npm run start` for production-grade performance
- [ ] Close DevTools if open
- [ ] Check that BTC price is loading (CoinGecko API live)

**Time target:** 10 minutes. Keep moving. The product speaks for itself — don't over-explain.

---

## What NOT to Show

Avoid these during any demo or screen share:

| What | Why | Alternative |
|---|---|---|
| `/settings` → Auth section | Shows your email if signed in | Skip auth section entirely |
| Real memory items | May contain sensitive personal or business notes | Use Demo Mode — demo memory is safe |
| Real relationships | Contains real names, emails, and notes | Use Demo Mode — demo contacts are fictional |
| Real opportunities | May reveal confidential client names or deal sizes | Use Demo Mode |
| `.env` file or terminal | Contains API keys | Never open terminal during demo |
| `SUPABASE_URL` in settings | Reveals your database URL | Skip Persistence Mode detail rows |
| AI Panel history | May contain sensitive prior conversations | Clear AI messages before demo OR scroll past |
| `/leads` route | Contains real lead data | Do not navigate to this route |

---

## Safe Walkthrough Order

This order maximizes wow-factor while keeping sensitive data out of frame:

1. **`/`** — Command Center homepage (TodayCommand hero, intelligence zones)
2. **`/chief`** — Chief of Staff brief (the intelligence differentiator)
3. **`/strategy`** — Strategic layer (North Star, objectives, 30/60/90)
4. **`/goals`** — Goal decomposition (objectives → milestones → tasks)
5. **`/daily`** — Daily Operating Rhythm (Morning Brief → priorities → wrap)
6. **`/memory`** — Memory module (demo data safe, show search)
7. **`/relationships`** — Personal CRM (demo contacts safe, show AI advisor)
8. **`/opportunities`** — Scored pipeline (demo opportunities safe)
9. **`/settings`** — Show: Onboarding progress, Workspace section, Export button only. Skip: Auth, Supabase detail rows.

**Skip during standard demo:** `/content`, `/focus`, `/planner`, `/broll`, `/narrative`

---

## After the Demo

- [ ] Go to Settings → Demo & Privacy → **Exit Demo Mode** (or click "Exit" on the badge)
- [ ] Page reloads — your real data is restored
- [ ] Verify your real projects/memory appear on the homepage
- [ ] Delete the demo JSON export file if no longer needed

---

## Setup Before Demo (Legacy checklist — now superseded by v7.2 checklist above)

- [ ] App running at localhost:3000 (or live URL)
- [ ] Demo Mode enabled (Settings → Demo & Privacy)
- [ ] At least 1 completed focus session visible
- [ ] Browser zoom at 90%–100%
- [ ] No browser extensions visible in toolbar
- [ ] Supabase configured (shows "Supabase Ready" in settings) — optional but impressive
- [ ] Dark background behind browser for screen recordings

---

## Minute 0:00 — Opening Hook (30 sec)

**Say:**
> "I built this because I was drowning in tools. Notion for notes. A spreadsheet for goals. ChatGPT for strategy. A separate CRM. None of them talked to each other, and none of them knew my actual context.
>
> So I built one system. Private. Instant. AI-powered. This is Sovereign OS."

**Do:** Open the app to the Command Center homepage.

---

## Minute 0:30 — Command Center Overview (1 min)

**Show:** DashboardShell with all zones visible — TodayCommand hero, Executive zone, Execution zone.

**Say:**
> "This is your command center. Everything you're about to see computes instantly from your data — no API calls, no loading spinners, no subscriptions to five different tools.
>
> Right here at the top — this is your daily command brief."

**Point to TodayCommand:**
- Top Action cell: "This is the single highest-leverage thing you could do right now, derived from your projects, opportunities, and strategy."
- Risk cell: "Your biggest risk — flagged automatically."
- Top Objective cell: "Your primary strategic objective, always visible."
- Momentum score: "How much forward motion you have this week, scored 0 to 100."

**Say:**
> "This updates every time you open the app. Zero maintenance."

---

## Minute 1:30 — Chief of Staff (1.5 min)

**Navigate to:** `/chief`

**Say:**
> "This is your Chief of Staff. Think of it as an executive advisor that's read everything you've ever put into the system — your projects, your goals, your relationships, your history."

**Walk through:**
- **Executive Summary** — "A synthesized brief of where you are right now."
- **Highest Leverage Action** — "The one move that creates the most momentum today."
- **Biggest Risk** — "What could blow up if you don't address it."
- **Blocked Items** — "What's stuck and why."
- **Weekly Momentum** and **Strategic Alignment** score rings — "Are you moving fast? Are you moving in the right direction? Two different questions."
- **Recommended Schedule** — "Three blocks the system recommends for today based on your priorities."
- **AI Challenge panel** — "You can challenge this brief. The AI plays devil's advocate."

**Say:**
> "No other tool does this. Not Notion. Not ChatGPT. Not Monday.com. Because none of them know your projects, your people, your goals, and your history together."

---

## Minute 3:00 — Strategy (1 min)

**Navigate to:** `/strategy`

**Say:**
> "Now let's go one level up. This is your strategic layer."

**Show:**
- **North Star** — "Derived from your 1-year vision."
- **Confidence score ring** — "How much the system believes in your current direction, based on the quality of your data."
- **Top Objectives** — "Your 3–5 highest-priority goals right now, scored and ranked."
- **30/60/90-day tab** — Switch tabs to show each horizon. "What to focus on this month, this quarter, and by year-end."
- **Bottlenecks** — "What's blocking your biggest objective."
- **Strategic Risk** — "One thing that could derail your plan."

**Say:**
> "This isn't a static document. It recomputes every time you open it based on your live data."

---

## Minute 4:00 — Goals + Decomposition (45 sec)

**Navigate to:** `/goals`

**Say:**
> "Your objectives decompose automatically."

**Show one objective expanded:**
- Milestones (30d/60d/90d badges)
- Suggested tasks with project picker
- Content ideas
- Suggested follow-ups

**Say:**
> "You don't have to plan this manually. The system reads your objective and generates the milestones, tasks, content angles, and relationship follow-ups it would take to get there. You review and approve."

---

## Minute 4:45 — Actions (45 sec)

**Navigate to:** `/actions`

**Say:**
> "Now we get tactical. This is your Action Engine — a scored, prioritized queue of the things that matter most right now."

**Show:**
- Urgent / Strategic / Relationship / Content sections
- One action expanded with Develop Plan button
- "→ Task" conversion button

**Say:**
> "Every action here is scored on impact, urgency, and effort. The system is telling you what to do and why. You can develop a plan with AI, convert it to a project task, or save it as an opportunity."

---

## Minute 5:30 — Daily Operating Rhythm (1 min)

**Navigate to:** `/daily`

**Say:**
> "This is the structure that turns all of this intelligence into actual execution."

**Walk through:**
- **Morning Brief** — "Auto-computed from all those engines. Top action, risk, objective, summary."
- **Start Your Day** — "Four checkboxes, three priority inputs. Mark what you're doing today."
- **Midday Check-In** — "What got done? What's blocked?"
- **End of Day** — "What did you complete? What slipped? What's tomorrow's top item? Save it to memory, convert slipped items to tasks, wrap the day."

**Say:**
> "This is the ritual layer on top of the intelligence layer. You plan with the system. You execute with the system. You review with the system."

---

## Minute 6:30 — Memory (45 sec)

**Navigate to:** `/memory`

**Say:**
> "Every insight, decision, meeting note, and piece of context lives here."

**Show:**
- Memory list with type badges
- Click one item to expand the modal
- Search bar — type a keyword
- Optional: trigger semantic search if vector memory is enabled

**Say:**
> "This isn't just a note-taking app. Every memory item is automatically used as context when the AI generates your executive brief, your action engine, and your daily recommendations. The more you put in, the smarter it gets."

---

## Minute 7:15 — Relationships (45 sec)

**Navigate to:** `/relationships`

**Say:**
> "This is your personal CRM. It knows who everyone is, how they're connected to your projects and opportunities, and when you need to follow up."

**Show:**
- Person card expanded — note, follow-up date, linked projects
- AI Relationship Advisor panel: "You can ask the AI about your relationship with anyone in the system."

**Say:**
> "It's not a database. It's a living context map of your professional relationships — connected to everything else."

---

## Minute 8:00 — Opportunities (30 sec)

**Navigate to:** `/opportunities`

**Say:**
> "Every opportunity is scored, tracked, and developable with AI."

**Show:**
- Opportunity list with scores
- One expanded — type, status, AI Develop button
- Convert modal briefly — "Convert to project, task, content idea, or memory."

**Say:**
> "Nothing falls through the cracks. Every lead, idea, or open door has a home."

---

## Minute 8:30 — Settings / Data Ownership (1 min)

**Navigate to:** `/settings`

**Say:**
> "Now the most important part. Your data."

**Show:**
- Workspaces section — "You can organize across multiple contexts — personal, business, clients."
- Data & Storage section — click Export button briefly: "One click. All your data as a JSON file. No lock-in."
- Sync Roadmap — "This shows you exactly where your data lives and what's synced."
- System Info — "Version, persistence mode, everything visible."

**Say:**
> "You own this. Not me. Not a company. Not a platform. Every piece of data you put in is yours to take back out at any time. That's not a marketing line — it's a technical guarantee."

---

## Minute 9:30 — Close (30 sec)

**Navigate back to:** `/` (Command Center)

**Say:**
> "I built this for myself. It runs my projects, my goals, my relationships, my content, and my day. It's private, instant, and it knows my context.
>
> I'm opening it up to a small group of founders and builders who want to own their tools. If that's you — [CTA: link, email, or DM]."

**Screen hold on TodayCommand hero for outro.**

---

## Demo Tips

- **Don't read from this script.** Know the flow; speak naturally.
- **Use real data** — even if sparse, authentic data is more convincing than clean fake data.
- **Pause on the intelligence.** The engines are the differentiator. Let the audience read what the brief says.
- **Lead with the problem, not the features.** "Tools that don't talk to each other" is the hook. The product is the answer.
- **For Agentic Systems client demos:** Skip Content Engine. Emphasize Chief, Strategy, Relationships, Opportunities, and Daily Rhythm. Frame as "this is what I'd configure for your business."

---

## Screen Recording Checklist

- [ ] Screen recorded at 1080p or 1440p
- [ ] Microphone tested (no echo, no background noise)
- [ ] Browser bookmarks bar hidden
- [ ] Notifications disabled (Do Not Disturb on)
- [ ] Timer visible in corner (optional but useful for pacing)
- [ ] Run through once before recording — don't ad-lib the first time

---

_Demo Script — Sovereign OS v6.8 · Created 2026-06-19_
