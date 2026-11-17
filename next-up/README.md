# Next Up

A small iPhone app for getting through a fast, interrupted clinic day with ADHD. It does three things:

1. **Now**: capture a task in one tap, see the one thing you're doing, and see what's next.
2. **Checklists**: quick-start step lists for exam rooms, surgery, drop-offs, boarder exams, pharmacy and inventory.
3. **Focus**: tap a time (5, 10, 15 or 25 min) and a big shrinking disc shows what's left. You can invite a coworker to work until the same end time.

There are no accounts, no settings screen and no server. Everything stays on your phone.

---

## Get it on your iPhone

The app is a web app you add to your home screen. Once added, it opens full screen like a normal app and works with no signal. You do this setup once.

### Step 1: Put it online (5 minutes, on a computer or phone browser)

The app files live in the `next-up` folder of your GitHub repository `second-brain`. GitHub can host them for free with a feature called GitHub Pages.

1. Go to your repository on github.com.
2. The app is on the branch `claude/pensive-albattani-p33viy`. Open a pull request from that branch into `main` and merge it. (Or ask Claude to open the pull request for you, then tap **Merge**.)
3. In the repository, tap **Settings**, then **Pages** in the left menu.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**. Set the branch to **main** and the folder to **/ (root)**. Tap **Save**.
5. Wait 1 to 2 minutes. Your app address will be:
   **https://skittlesvet287.github.io/second-brain/next-up/**

If GitHub says Pages isn't available, your repository is private and your plan doesn't include Pages for private repositories. Either make the repository public (the app code contains no personal data) or use the backup option below.

**Backup option (no GitHub Pages):** on a computer, go to https://app.netlify.com/drop, create a free account, and drag the `next-up` folder onto the page. Netlify gives you a web address. Use that address in Step 2.

### Step 2: Add it to your home screen (1 minute, on the iPhone)

1. Open the app address in **Safari** (not Chrome; only Safari can add web apps to the iPhone home screen).
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open **Next Up** from your home screen from now on. That's the copy that keeps your data.

### Optional
- **Urgent count on the app icon**: inside the app tap **⋯** then **Show urgent count on app icon** and allow notifications. The icon then shows how many urgent or due tasks you have.
- **Backups**: tap **⋯** then **Back up my data** once in a while and save the file to Files or email it to yourself. Restore with **Restore from a backup**.

### Giving it to coworkers
Send them the same app address. They follow Step 2. No training is needed past the 7-line quick guide inside the app (**⋯** then **Quick guide**). On a shared workstation, just open the address in any browser.

---

## How to use it

| You want to... | Do this |
|---|---|
| Capture a task | Type in the bottom box, tap **Add**. Tap **!** first (or start with "!") to make it urgent. Use the keyboard mic to talk instead of typing. |
| Start a task | Tap ▶. Only one task is "Doing now". |
| Switch tasks | Tap ▶ on a different task. The current one goes back to the top of the list on its own. |
| Handle an interruption | Tap **Pause**, type where you left off ("meds drawn up, need label"), done. The note shows when you come back. |
| Prioritize | Tap a task: **Mark urgent**, **Later, not today**, **Waiting on someone**, or **Set a time**. |
| Break a task down | Tap a task, **Edit or break into steps**, one step per line. The Doing card then shows one step at a time. |
| Run a clinic checklist | **Checklists** tab, tap one. Add the patient or room name if you want. The big ✓ on the Now screen ticks the next step. |
| Hand off | Inside a checklist, **Share for handoff** sends "what's done, what's next" to Messages or wherever you paste it. |
| Change a checklist | **Checklists**, **Edit or add checklists**. Changes save as you type. **Share with a coworker** sends them a link that adds it to their app. |
| Focus | **Focus** tab, tap a time. The screen stays on. Park distracting thoughts in the box under the timer. |
| Body double | During a session tap **Invite someone**. They open the link and count down to the same end time. |

---

## Why these features (with sources)

I've marked each item as **evidence** (backed by the source cited) or **my judgment** (a design call that fits the evidence but hasn't been tested in this form). None of this is medical advice.

| Feature | What it does | Basis |
|---|---|---|
| One-tap capture, everything written down | Gets tasks out of your head the moment they show up | **Evidence:** adults with ADHD show moderate working-memory deficits compared with controls ([Alderson et al., 2013](https://pubmed.ncbi.nlm.nih.gov/23688211/)). Barkley's model of ADHD centers on self-regulation and working memory problems and supports putting information outside your head ([Barkley, 1997](https://doi.org/10.1037/0033-2909.121.1.65)). CHADD recommends writing commitments and ideas into one planner instead of relying on memory ([CHADD: day planners](https://chadd.org/for-adults/time-management-planner)). |
| Urgent / today / later | Three buckets, set with one tap | **Evidence:** CBT programs for adult ADHD teach keeping one task list and sorting it by priority ([Safren et al., 2010, JAMA](https://pmc.ncbi.nlm.nih.gov/articles/PMC3641654); [Solanto et al., 2010](https://pubmed.ncbi.nlm.nih.gov/20231319/)). **My judgment:** cutting it to three buckets and one tap so you can do it mid-interruption. |
| Break into steps, one step shown at a time | Shrinks the start of a task | **Evidence:** breaking large tasks into small steps is a core skill in those same CBT programs (Safren 2010; Solanto 2010). **My judgment:** showing only the next step. |
| Park a distracting thought during focus | Saves the thought without leaving the session | **Evidence:** "distractibility delay", writing a distracting thought down to deal with later, is part of the Safren CBT program (Safren 2010). |
| Pause with a "left off" note | Helps you resume after an interruption | **Evidence (not ADHD-specific):** interruption research shows memory for a suspended goal fades, and a visible cue speeds resuming the task ([Altmann & Trafton, 2002](https://doi.org/10.1207/s15516709cog2601_2); [Trafton, Altmann & Brock, 2005](https://www.interruptions.net/literature/Trafton-HFES05.pdf)). **My judgment:** that this transfers to ADHD and to a clinic floor. |
| Shrinking disc timer, "until 2:45", time on task, due times | Makes time visible | **Evidence:** CHADD's time management guidance teaches making time visible by externalizing it ([CHADD webinar, Tuckman](https://chadd.org/webinars/understanding-and-applying-the-science-of-time-management/)). **My judgment:** the 5 to 25 minute lengths. I found no strong ADHD-specific evidence for any particular session length. |
| Clinic checklists | Repeatable steps for repeat work | **Evidence (not ADHD-specific):** checklists cut complications and deaths in surgical teams ([Haynes et al., 2009, NEJM](https://doi.org/10.1056/NEJMsa0810119)). **My judgment:** that they also take load off working memory for ADHD in a vet clinic. The default steps are generic starting points, not a protocol. Edit them to match your clinic. |
| Shared end-time timer (body doubling) | A coworker counts down to the same moment as you | **Early evidence:** a survey of 220 people, mostly neurodivergent, found body doubling helps with starting tasks and feeling less alone, and recommends tools that work across different places and times ([Eagle, Baltaxe-Admony & Ringland, ACM TACCESS 2024](https://doi.org/10.1145/3689648)). That's an exploratory study, not a trial. **My judgment:** the form it takes here. |
| One "Doing now" task, "Next up" card | Answers "what do I do now?" at a glance | **My judgment**, built on the externalizing principle above. |

### Body doubling: what this app can and can't do
It's a **shared timer**, not a live partner. When you tap **Invite someone**, the app makes a link with your session's end time. Your coworker opens it and their timer counts down to the same moment, so you're both working toward the same finish line, in the same room or not. At the end either of you can tap **Send a check-in**. There's no video, no chat and no "I can see you're still working" presence, because that needs a server and accounts, and the app has neither.

---

## Why a web app, and what that means

**What I chose:** an installable web app (PWA) in plain HTML, CSS and JavaScript, saved to your home screen. It needs no Xcode, no Apple developer account ($99/year) and no App Store review, and you can update it by editing files. A native SwiftUI app would need a Mac and would have to be reinstalled every 7 days without a paid developer account.

**How it handles iPhone needs:**
- **Offline:** a service worker stores the app on the phone, so it opens and works with no signal.
- **Your data:** saved on the phone in the app's own storage. Apple exempts home-screen web apps from Safari's 7-day storage cleanup. Still, use **Back up my data** now and then.
- **Screen stays on** during focus sessions. This works in the home-screen app on iOS 18.4 and newer. On older versions the screen may dim, so tap it now and then.
- **Time's up and due alerts:** a soft chime plus a screen flash, **only while the app is open**. The chime follows your ring/silent switch.

**Limits you should know:**
- **The app can't ring or notify you while it's closed.** iPhone web apps can only get background notifications from a push server, and this app has no server on purpose. For anything that must not be missed (meds, a recovery check), also set an iPhone alarm or Reminder.
- **No vibration.** Safari on iPhone doesn't allow it.
- **Safari and the home-screen app keep separate data.** Links coworkers send you open in Safari. To add a shared checklist to your home-screen app, copy the link, then in the app go to **Checklists**, **Edit or add checklists**, **Add one a coworker sent me** and paste it.
- **No sync.** Each phone or computer has its own list. That keeps your personal list personal.

---

## Assumptions I made
- You have an iPhone on iOS 16.4 or newer and use Safari.
- You'd rather have zero setup and zero accounts than sync between devices.
- Your list is personal; the team part only needs shared checklists, handoff text and the shared timer.
- The default checklist steps are generic for a small general practice. I'm not a vet; your clinic's protocols win.
- Short sessions (5 to 25 min) suit a day with constant interruptions better than long blocks.
- Patient names typed into the app stay on your phone. Your clinic may have a rule about patient info on personal phones; using pet names or room numbers only is the safe default.
- A soft chime is OK at work and you'll keep the phone on ring if you want to hear it.

## Next features you could add later
1. **Real reminders while the app is closed:** a tiny push server (for example a free Cloudflare Worker) sending Web Push at a task's due time.
2. **Shared clinic board:** a shared list of checklists in progress (which patient is at which step) on a workstation screen. Needs a small backend.
3. **Siri Shortcut capture:** "Hey Siri, add to Next Up" through a Shortcut that opens the app with the text filled in.
4. **Per-patient timers:** "recheck temp in 15 min" tied to a running checklist.
5. **End-of-shift handoff:** one button that turns everything still open into a handoff note for the next person.

## Files
| File | What it is |
|---|---|
| `index.html` | The page shell |
| `styles.css` | Look and layout (light and dark mode) |
| `app.js` | All app logic, including the default checklists at the top |
| `sw.js` | Offline support. Change `VERSION` whenever you edit a file so phones pick up the update. |
| `manifest.webmanifest`, `icons/` | Home screen name and icon |

To change the default checklist steps for everyone who installs fresh, edit `DEFAULT_TEMPLATES` at the top of `app.js`. People who already use the app keep their own edited versions.
