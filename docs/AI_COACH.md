# AI coach: setup and deployment

## How it works
- **No text box.** The app asks the server for 5 questions picked for the person (from their coach quiz and recent mood/check-in data). They tap one; the answer comes back with 3 follow-up questions and, where it fits, a button into one of the app's tools.
- **Free tier:** 5 questions per device per day (UTC). Suggestions don't count; refreshing them is capped at 6 times a day.
- **Safety:** every answer carries a `safety` flag. `concern` shows a "talk to a GP" card, `crisis` shows a prominent card that opens the crisis lines. Inputs are validated against fixed option lists, so the public endpoint can't be used as a general chatbot.
- **Privacy:** only quiz choices, an optional first name, mood labels and check-in scores are sent. Notes, journal entries and contacts never leave the phone. The server logs no request bodies.
- **Model:** `claude-haiku-4-5` (lowest cost, about $0.003 per answer) by default. Set the `COACH_MODEL` secret to `claude-opus-5-5` for richer answers at several times the cost. Each request logs its token count and estimated cost in the server output.

## Preview in the browser
```bash
bash scripts/preview-web.sh
```
Builds the web version and serves it together with the coach on one URL (open the Webview tab). Pop-up alerts, reminders, Face ID and phone calls only work on a real phone.

## Deploy on Replit
1. In your Wellbeing Repl, open **Tools → Secrets** and add `ANTHROPIC_API_KEY`. Create the key inside a workspace (Console → Workspaces → Default → API keys); if your key isn't workspace-scoped, also add `ANTHROPIC_WORKSPACE_ID` (starts with `wrkspc_`) (you can reuse the NutriEat key, or create a separate one so you can see each app's usage).
2. In the Shell:
   ```bash
   git pull origin claude/gifted-hamilton-lkjivb
   bash scripts/coach-server.sh check   # install + typecheck + tests
   bash scripts/coach-server.sh try     # real end-to-end test with your key
   ```
3. Click **Deploy** and choose **Reserved VM** (the smallest is fine). The daily limit is counted in memory, so it needs a single instance that stays on: Autoscale would reset counts whenever it scales to zero.
   - Build command: `bash scripts/deploy-build.sh`
   - Run command: `cd server && WEB_DIST=../dist npm start`

   This serves the web version of the app, the coach and accounts from the same address.
4. When it's live, copy the URL (e.g. `https://wellbeing-coach.replit.app`) and run:
   ```bash
   bash scripts/coach-server.sh set-url https://wellbeing-coach.replit.app
   git commit -am "Point app at coach server" && git push
   ```
5. Rebuild the app (`bash scripts/release-ios.sh`). The coach card appears on Home only when this URL is set, so a build without it behaves exactly like before.

## Before submitting with the coach
- Update the App Privacy answers in App Store Connect (see docs/APP_STORE.md §4) and re-host the updated PRIVACY.md.
- Set a monthly spend limit in the Anthropic Console (Settings → Limits) so a bug or abuse can't run up a bill.

## Later
- **Wellbeing Plus:** raise the limit for subscribers by verifying a RevenueCat entitlement on the server.
- **Durable limits:** move `server/src/quota.ts` to Replit DB or Postgres if you need more than one server instance.
