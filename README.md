# No Mercy

Your offline training planner. Every morning it builds one session (Strength, Soviet, Fascia, Track or Rest) from your full history, and it runs entirely on your phone. All data stays on your phone: nothing is sent anywhere.

This guide gets it onto your iPhone in about 15 minutes, free, using GitHub Pages. No coding needed.

---

## What's in the folder

| File | What it is |
| --- | --- |
| `index.html` | The app's page |
| `styles.css` | The look: dark mode, big buttons |
| `library.js` | Exercises, sessions, sports and default settings |
| `engine.js` | The planner: fatigue, targets, outcomes, the daily decision |
| `ui.js`, `screens.js`, `app.js` | The screens and buttons |
| `sw.js` | Makes it work offline |
| `manifest.json` + 4 icons | Lets it install on your Home Screen |
| `README.md` | This guide |

Upload all of them together. The app needs every file.

---

## Step 1: Make a free GitHub account

1. Go to **github.com** and tap **Sign up**.
2. Pick a username. It becomes part of your app's address, for example `gurasees.github.io/no-mercy`.
3. Verify your email.

## Step 2: Create the repository (the app's folder online)

1. Signed in, tap **+** (top right) → **New repository**.
2. Repository name: `no-mercy`.
3. Choose **Public**. Free GitHub Pages needs a public repository. Only the app's code is public; your training data never leaves your phone.
4. Tick **Add a README file** (it gives the repository a first file so uploads work smoothly).
5. Tap **Create repository**.

## Step 3: Upload the files

**From a computer**

1. Unzip `no-mercy.zip`.
2. In your new repository, tap **Add file** → **Upload files**.
3. Open the unzipped `no-mercy` folder, select all 14 files inside it, and drag them onto the page.
4. Tap **Commit changes**. If GitHub asks about replacing `README.md`, that's fine.

**From your iPhone only**

1. Save `no-mercy.zip` to the **Files** app, then tap it once: Files unzips it into a `no-mercy` folder.
2. In Safari, open your repository on github.com. If you see the mobile view, tap **Add file** → **Upload files** (if that option is missing, tap **aA** in the address bar → **Request Desktop Website** and try again).
3. Tap **choose your files**, open the `no-mercy` folder, tap **Select**, select all 14 files, then **Open**.
4. Tap **Commit changes**.

Check that all 14 files are listed in the repository, at the top level (not inside a subfolder).

## Step 4: Turn on GitHub Pages

1. In the repository, tap **Settings** → **Pages** (in the left menu; on a phone, scroll the settings list).
2. Under **Build and deployment**, Source: **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Tap **Save**.
4. Wait 1–3 minutes, then refresh the page. A box appears: *"Your site is live at https://YOUR-USERNAME.github.io/no-mercy/"*.

## Step 5: Install it on your iPhone

1. Open that address in **Safari** (it must be Safari).
2. Wait until the welcome screen appears, so everything has downloaded.
3. Tap the **Share** button (square with an arrow) → **Add to Home Screen** → **Add**.
4. **From now on, always open No Mercy from its Home Screen icon.** iPhone keeps the Home Screen app's data separate from Safari's, so set it up inside the installed app, not in the Safari tab.

The first time you open the icon, set your bodyweight, tick the kit you weren't sure about (dip station, power rack, Smith machine and so on), and tap **Start today**.

It now works with no internet connection: in the gym basement, on a plane, anywhere.

---

## Daily use

- **Today** shows the session (or rest day), why it was chosen, the targets to beat and the next 3 days. Tap **Start session**.
- In a session, log each set with the + / − buttons or by typing. The rest timer starts by itself; tap an exercise's name for form cues. **Swap** if a machine is taken.
- **Playing later today** turns today into a rest day; confirm the game's real numbers afterwards. **Log a game** records one you didn't plan.
- **Tweaked joint**, **I'm sick**, **Travelling** and the Gym / Field / Bodyweight switch re-plan the day.
- **History** lets you fix any logged number; everything after it is recalculated.
- **Progress** has charts and PRs. **Body** shows fatigue per muscle, the whole-body meter, anchor gaps, days since every area, and the block.
- **Settings** holds every number in the training system, your equipment, the exercise library, slots, blocks and sports.

Keep the phone's ringer on if you want timer beeps. The app keeps the screen awake during a session where iOS allows it; if your screen still dims, raise **Settings → Display & Brightness → Auto-Lock** while you train. A timer that runs while the phone is locked catches up when you unlock it.

---

## Back up your data (important)

Your log lives only on this phone. If you delete the app, reset the phone, or iOS clears website data, it's gone unless you have a backup.

- **Settings → Backup and data → Export a backup**, then **Save to Files** (iCloud Drive keeps it safe). Do it every week or two; the Today screen reminds you if it's been a while.
- To restore, on a new phone or after reinstalling: **Restore from a backup** on the welcome screen, or **Settings → Backup and data → Import a backup**, then pick the file.
- **Check storage protection** in the same section tells you whether the phone has agreed not to clear the app's storage on its own.

---

## Updating the app later

If you get new versions of the files:

1. In your repository, **Add file → Upload files**, upload the changed files (same names), and **Commit changes**.
2. Wait a couple of minutes, then open the app while online. A banner says **Update ready**: tap **Reload**. Your data stays.

If you edit the files yourself, change the version in the first lines of `sw.js` (for example `no-mercy-1.0.0` → `no-mercy-1.0.1`), or phones won't notice the update.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| The address shows a 404 page | Wait a few more minutes after turning on Pages. Check the files are at the top level of the repository, and the address ends in `/no-mercy/`. |
| The installed app is empty but Safari had data | The Home Screen app has its own storage. Export from wherever your data is, then import in the Home Screen app. |
| No "Update ready" banner after uploading | Open the app while online, close it fully (swipe it away), open it again. Check you changed the version in `sw.js` if you edited files yourself. |
| No beeps | Ringer switch on, volume up, and **Settings → Display and sound → Timer beeps** on. Tap **Test the beep**. |
| Something looks wrong in a plan | Tap **Re-plan** on the Today screen. Every reason the planner used is listed on the Today card. |
