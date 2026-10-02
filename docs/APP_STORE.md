# App Store submission guide — Wellbeing

## 1. One-time setup
1. Join the Apple Developer Program (developer.apple.com/programs, $99/year). Approval can take 1–2 days.
2. Create a free Expo account at expo.dev.
3. Host `PRIVACY.md` at a **public** URL (the GitHub repo is private). Options: a public GitHub Gist, Notion page, or a Replit static deployment. Replace `SUPPORT_EMAIL_HERE` first.

## 2. Build and upload
In the Replit shell:
```bash
bash scripts/release-ios.sh
```
Sign in with your Apple ID when EAS asks and let it create the certificates. The build uploads to TestFlight automatically.

## 3. App Store Connect listing (appstoreconnect.apple.com → My Apps → Wellbeing)

| Field | Value |
|---|---|
| Name | Wellbeing (if taken: "Wellbeing: Mood & Calm") |
| Subtitle | Mood tracker, journal & calm |
| Category | Health & Fitness (secondary: Lifestyle) |
| Price | Free |
| Age rating | 12+ is typical for mental-health topics. Answer "Medical/Treatment Information: Infrequent/Mild". |
| Privacy Policy URL | your public PRIVACY.md URL |
| Support URL | same page, or any page with your contact email |

**Promotional text**
> A calm, private space to notice how you feel and take small steps that help.

**Description**
> Wellbeing helps you check in with yourself, understand your patterns and find support when things feel hard — all privately on your device.
>
> CHECK IN
> • Log your mood in seconds, with an optional note
> • Daily check-ins for sleep, energy and stress
> • History, streaks and weekly insights
>
> TOOLS FOR HARD MOMENTS
> • Box breathing and 5-4-3-2-1 grounding
> • Meditation studio with calming audio
> • Anxiety support and guided journaling
> • Sleep reset routine
>
> PLAN AND GROW
> • Habits and weekly goals
> • Mental state planner for your capacity today
> • Therapy companion to prepare for sessions
>
> SUPPORT WHEN YOU NEED IT
> • One tap to crisis lines in the UK, Ireland, US, Canada and Australia
> • Trusted contacts with a ready-to-send message
>
> PRIVATE BY DESIGN
> • No account, no ads, no tracking
> • Optional Face ID lock
> • Export or delete your data at any time
>
> Wellbeing supports self-care and is not a medical device. It does not diagnose or treat any condition. If you are in danger, contact your local emergency services.

**Keywords** (100 chars max)
`mood,tracker,journal,anxiety,mental health,meditation,breathing,calm,self care,stress,sleep,diary`

## 4. App Privacy questionnaire
Choose **"Data Not Collected"**. Everything stays on the device and nothing is sent to you or third parties.

## 5. Screenshots
Required: a 6.9" iPhone set (1320×2868) and, because iPad is supported, a 13" iPad set (2064×2752). Take them in the iOS Simulator or with TestFlight on a device: Home, Check-in, Insights, Breathe, Get help now.

## 6. Notes for App Review
> Wellbeing is a self-care app; all data is stored locally with no account or login required. The "Get help" button on the Home screen opens crisis-line numbers for several countries. The app includes a clear disclaimer at first launch and in Settings that it is not a medical device. No in-app purchases in this version.

## 7. Later: subscriptions (Wellbeing Plus)
The placeholder paywall was removed because Apple rejects price screens that cannot take payment. To add it back properly: create auto-renewable subscriptions in App Store Connect, integrate RevenueCat (`react-native-purchases`), and include Restore Purchases, Terms of Use (EULA) and Privacy links on the paywall.
