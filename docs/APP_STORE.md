# App Store submission guide – Wellbeing: Mood & Calm

Everything below matches the app as built. Copy each block into App Store Connect as-is.

## 1. Build and upload

In the Replit Shell:

```bash
bash scripts/release-ios.sh
```

Sign in with your Apple ID when EAS asks and let it create the certificates. The build uploads to TestFlight automatically; it appears in App Store Connect after 10–30 minutes of processing.

## 2. App Information

| Field | Value |
|---|---|
| Name | Wellbeing: Mood & Calm |
| Subtitle | Mood tracker, journal & calm |
| Bundle ID | com.pradiconsulting.wellbeing |
| Category | Health & Fitness (secondary: Lifestyle) |
| Content rights | Yes, contains third-party content, and I have the rights (AI replies via Anthropic; open-source icons) |
| Age rating | 18+ (overridden from the calculated 13+) |
| Price | Free, with Wellbeing Plus subscriptions |
| Availability | United Kingdom, Ireland, United States, Canada, Australia, Germany, Switzerland, Denmark, Poland, India |
| Privacy Policy URL | https://wellbeing-app.replit.app/privacy |
| Support URL | https://wellbeing-app.replit.app/support |
| Marketing URL | leave empty |
| Copyright | 2026 Prathap Adicherla |

## 3. Version 1.4 listing

**Promotional text** (170 characters max; can be changed any time without review)

```
A calm pause every day, original sleep and focus sounds, and guided tea rituals. Check in, spot your patterns and find what actually helps you.
```

**Keywords** (100 characters max; words already in the name and subtitle are indexed, so they are not repeated)

```
anxiety,stress,meditation,breathing,sleep sounds,therapy,mindfulness,tea,selfcare,wellness,ai coach
```

**Description** (4000 characters max)

```
Wellbeing is a calm, private space to notice how you feel and take small steps that help.

CHECK IN WITH YOURSELF
• Log your mood in seconds, with an optional note
• Daily check-in for sleep, energy and stress
• See your streaks, mood trends and patterns over time

SOUNDS, TEA AND A DAILY PAUSE
• Today's pause: a 12-second calm video with a few kind words, new every day
• 8 original soundscapes for calm, focus and sleep, with a sleep timer that fades gently and keeps playing when your screen is locked
• Tea rituals: 8 caffeine-free teas turned into a guided, unhurried pause, with honest evidence notes and clear cautions
• What helps me? Choose how you feel and how much time you have, and get one thing to try, based on what has helped you before

AN AI COACH THAT GETS YOU
• Answer a short quiz and the coach suggests questions that fit what you are dealing with
• Practical, encouraging next steps based on your recent check-ins
• Points you to the right tool in the app, such as breathing or grounding
• 5 free questions every day

TOOLS FOR CALM
• Box breathing and 5-4-3-2-1 grounding
• Bubble release, a calm 3-minute game
• Guided meditations with gentle ambient sound
• Anxiety support and a sleep reset routine
• Reflective journal that helps you reframe difficult thoughts
• Habits and weekly goals
• Mental state planner for the moments you find hard

GET MORE FROM THERAPY
• Plan what you want to talk about and the questions to ask
• Keep the small actions you agree with your therapist visible between sessions

HELP WHEN IT MATTERS
• One tap to crisis lines for your country, including the UK, Ireland, US, Canada, Australia, Germany, Switzerland, Denmark, Poland and India

PRIVATE BY DESIGN
• Your moods, journal and notes are stored only on your phone
• No ads, no tracking, no analytics
• Optional app lock with Face ID
• Accounts are optional; the app works fully without one

WELLBEING PLUS
Upgrade to unlock all 8 soundscapes and the guided ritual for all 8 teas, get 30 AI coach questions a day, and keep Plus on all your devices with a free account. Plus is available as a monthly or annual auto-renewing subscription. Payment is charged to your Apple account and renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel any time in your App Store account settings.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://wellbeing-app.replit.app/privacy

Wellbeing supports everyday self-care. It is not a medical device and does not provide diagnosis, treatment or crisis support. If you are in danger, contact your local emergency number. For adults aged 18 and over.
```

## 4. App Review Information

**Sign-in required:** No (accounts are optional). Still fill in the demo account below so the reviewer can test sign-in, password reset and account deletion.

**Demo account:** create it first on the live server: open https://wellbeing-app.replit.app, finish onboarding, choose Create account, and use an email you can read (for example `wellbeingsupport247+review@gmail.com`, which arrives in the support inbox). Enter that email and password in the sign-in fields.

**Notes** (paste as-is)

```
Wellbeing is a self-care app: mood logging, daily check-ins, journaling, breathing, grounding, meditation, a therapy-session planner and an optional AI coach. It is not a medical device; this is stated at first launch, in the coach, and in the description.

AI COACH: Home > "Your AI coach". The user must agree to a consent screen before anything is sent. Replies are generated by Anthropic's Claude model through our server. Only quiz answers, an optional first name, recent mood ratings, check-in scores and the chosen question are sent; journal entries, notes and contacts never leave the device. Free users get 5 questions a day; Wellbeing Plus subscribers get 30. If a question suggests risk, the coach shows a safety card linking to crisis lines.

CRISIS SUPPORT: "Get help" on Home opens crisis lines for the user's country (based on the device region), with one-tap calling and findahelpline.com for other countries.

ACCOUNTS (optional): Settings > "Create account or sign in". Use the demo account provided. Password reset: Sign in > "Forgot password?" emails a 6-digit code. Account deletion: Settings > Account > "Delete account" permanently deletes the account on our server.

SUBSCRIPTIONS: Settings > "Wellbeing Plus" shows the monthly and annual auto-renewable subscriptions with prices, a Restore Purchases button, and links to the Terms of Use (Apple standard EULA) and Privacy Policy. Plus raises the coach limit from 5 to 30 questions a day.

PRIVACY: No ads, analytics or tracking. Data types declared in App Privacy match this behaviour.

AGE: Rated 18+; the app is intended for adults.
```

**Contact:** your name, phone number and wellbeingsupport247@gmail.com.

## 5. Subscriptions (Wellbeing Plus group)

| Reference name | Product ID | Duration | UK price |
|---|---|---|---|
| Plus Monthly | com.pradiconsulting.wellbeing.plus.monthly | 1 month | £4.99 |
| Plus Annual | com.pradiconsulting.wellbeing.plus.annual | 1 year | £39.99 |

Both: display name "Wellbeing Plus", description "All soundscapes, tea rituals, 30 coach questions/day" (Apple allows 55 characters; this is 52), review screenshot of the paywall (Settings > Wellbeing Plus), review note "Unlocks all 8 soundscapes, the guided ritual for all 8 teas and 30 AI coach questions per day. Free users get 2 soundscapes, 2 tea rituals, every tea's information and cautions, the daily pause videos and 5 coach questions a day. Manage via Settings > Subscriptions." Submit them together with version 1.4 (select them in the version's In-App Purchases and Subscriptions section).

## 6. App Privacy (Data Types)

Choose "Yes, we collect data". No data is used for tracking.

| Data type | Purpose | Linked to user |
|---|---|---|
| Health & Fitness > Health (mood ratings, check-in scores sent to the coach) | App Functionality | No |
| User Content > Other User Content (coach quiz answers and questions) | App Functionality | No |
| Identifiers > Device ID (random install ID for the daily limit) | App Functionality | No |
| Contact Info > Email Address (accounts, password reset) | App Functionality | Yes |
| Contact Info > Name (optional first name) | App Functionality | Yes |
| Identifiers > User ID (account ID) | App Functionality | Yes |
| Purchases > Purchase History (RevenueCat) | App Functionality | Yes |

## 7. Before you submit

- [ ] `curl https://wellbeing-app.replit.app/health` shows `"database":true` and `"email":true`
- [ ] Publishing is set to **Reserved VM** (not Autoscale)
- [ ] Demo account created and its password reset tested once
- [ ] TestFlight: sandbox purchase of Plus works and the coach shows 30 questions
- [ ] Screenshots uploaded (6.5" set, 1284 x 2778): home, today's pause, soundscapes, sleep timer, tea rituals, chamomile, what helps me
- [ ] EU and Swiss representative appointed if launching in those countries

## Version 1.1 – Apple Health

**What's New in This Version**

```
• Apple Health: see your sleep and steps next to your moods (optional, read-only, stays on your iPhone)
• History redesign: mood calendar, weekly summary and 14-day sleep, energy and stress trends
• Therapy companion: start a fresh plan after each session
• Bubble release: a calm, no-pressure 3-minute game paced by a breathing circle
• Fixes, including a crash when leaving a meditation
```

**Add to the review notes** (paste above the existing notes)

```
APPLE HEALTH (new in 1.1, optional, read-only): Settings > "Apple Health" or History > "Connect Apple Health" shows Apple's permission sheet for steps, walking distance and sleep analysis. The data is shown in History ("Sleep and steps" charts) and as a summary on Home. It never leaves the device: it is not sent to our server, the AI coach or any third party, not used for advertising, and not stored in iCloud. The app does not write to Apple Health. If access is denied, the app shows how to enable it and all other features work normally.
```

App Privacy answers do not change: Apple Health data is processed only on the device, so it is not "collected" under Apple's definitions.

## Version 1.2 – What helps me?

**What's New in This Version**

```
• What helps me?: tell Wellbeing how you feel and how much time you have, and get one thing to try
• "Did this help?" after breathing, grounding, meditation and Bubble release, so suggestions learn from your own answers
• Breathing sessions now have a 1, 3 or 5 minute length and a Finish button
• Back up your data to a file and restore it on any iPhone
• Fixes: the sleep reset checklist starts fresh each night, and your worry carries into the journal from Anxiety support
```

**Add to the review notes**

```
WHAT HELPS ME (new in 1.2): Home > "What helps me?" suggests an in-app exercise based on the feeling and time the user selects. After an exercise, an optional "Did this help?" rating is stored on the device only; suggestions use these ratings once there are at least three for that exercise and feeling, and are worded as observations, not medical claims. BACKUP: Settings > "Back up data" saves a JSON file via the share sheet; "Restore from backup" reads a file chosen with the document picker. Backups never leave the user's control and are not uploaded to our server.
```

## Version 1.4 – Soundscapes and Tea rituals (first public release includes everything above)

**What's New in This Version**

```
• Today's pause: a new 12-second calm video each day, with 8 to rewatch, free for everyone
• Soundscapes: 8 original sounds for calm, focus and sleep, with a sleep timer and offline playback
• Tea rituals: turn a caffeine-free tea into a guided, unhurried pause; every tea's information and cautions are free to read
• Wellbeing Plus now unlocks all soundscapes and tea rituals (2 of each are free)
• "Did this help?" now works after soundscapes and tea rituals too
```

**Add to the review notes**

```
PAUSE VIDEOS (new in 1.4): Home > Today's pause, and Home > Soundscapes > Short pauses. Eight 12-second original videos owned by the developer (AI-assisted visuals and voice, no third-party footage or music). Free for all users; the spoken words are also shown as text. Streamed from our server and cached on the device.
SOUNDSCAPES (new in 1.4): Home > Soundscapes. Eight original audio tracks owned by the developer (no third-party music). Two are free; six require Wellbeing Plus. Audio streams from our server and is cached on the device for offline play; it continues with the screen locked (background audio), with an optional sleep timer.
TEA RITUALS (new in 1.4): Home > Tea rituals. Eight common caffeine-free herbal teas presented as a guided mindfulness pause (brew timer and five reflective steps). Content is informational and conservative: no treatment or "clinically proven" claims, an honest evidence label on each tea, and specific cautions (allergies, pregnancy, medication). Herbs with known interaction risks for people taking mental-health medication (e.g. St John's wort, kava, valerian) are deliberately excluded. No products are sold or linked. Every tea's information and safety cautions can be read without subscribing; for six of the eight teas the guided ritual requires Wellbeing Plus.
PLUS CONTENT: To review Plus content without purchasing, use the demo account below (Plus is granted in RevenueCat) or a sandbox purchase.
```
