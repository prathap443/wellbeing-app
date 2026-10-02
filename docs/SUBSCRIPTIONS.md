# Wellbeing Plus: subscriptions, accounts and setup

## What's built
- **Paywall** (Home → Wellbeing Plus, Settings → Wellbeing Plus, or "Keep talking" when coach questions run out). Prices come live from the App Store; includes Restore purchases, auto-renew terms, Terms of Use and Privacy links (App Review guideline 3.1.2).
- **Plus benefit:** 30 AI coach questions a day instead of 5. The server checks the subscription with RevenueCat before applying the higher limit.
- **Optional account** (email + password), offered once after onboarding and in Settings → Account. Purchases are linked to the account so Plus works on all the user's devices. Sign out and **in-app account deletion** (guideline 5.1.1(v)) are included.
- Purchases work only in the real iOS build (TestFlight/App Store), not in the browser preview or Expo Go.

## 1. App Store Connect (appstoreconnect.apple.com)
1. **Business → Agreements**: accept the **Paid Apps** agreement and fill in tax and banking. Subscriptions don't load until this is active.
2. **Apps → Wellbeing → Monetization → Subscriptions** → create subscription group **Wellbeing Plus**.
3. Add two subscriptions to the group:
   | Reference name | Product ID | Duration | Price |
   |---|---|---|---|
   | Plus Monthly | `com.prathap443.wellbeing.plus.monthly` | 1 month | £4.99 |
   | Plus Annual | `com.prathap443.wellbeing.plus.annual` | 1 year | £39.99 |
   For each: add a display name and description (e.g. "Wellbeing Plus – 30 AI coach questions a day"), and a review screenshot of the paywall.
4. **Users and Access → Integrations → In-App Purchase**: generate an **In-App Purchase key** (.p8) and note its Key ID and Issuer ID. RevenueCat needs it.
5. **Users and Access → Sandbox → Test accounts**: add a sandbox tester to try purchases in TestFlight without being charged.

## 2. RevenueCat (app.revenuecat.com, free until $2.5k monthly revenue)
1. Create a project **Wellbeing** → add an **App Store** app with bundle ID `com.prathap443.wellbeing`; upload the In-App Purchase key from step 1.4.
2. **Product catalog → Products**: import the two products.
3. **Entitlements**: create entitlement with identifier **`plus`** and attach both products.
4. **Offerings**: the `default` offering → add packages **Monthly** (`$rc_monthly`) and **Annual** (`$rc_annual`) with the matching products. Make it current.
5. **API keys**: copy the **public iOS key** (`appl_…`) and create a **secret key** (`sk_…`).

## 3. Connect everything (Replit Shell)
```bash
bash scripts/coach-server.sh set-rc-key appl_xxxxxxxx   # puts the public key in app.json
git commit -am "Add RevenueCat key" && git push
```
In **Replit → Tools → Secrets** add:
| Secret | Value |
|---|---|
| `REVENUECAT_SECRET_KEY` | the `sk_…` key (lets the server confirm Plus) |
| `SESSION_SECRET` | already set; signs login tokens |
| `DATABASE_URL` | added automatically when you create a database in **Replit → Database** (stores accounts) |

Without `DATABASE_URL`, accounts live in memory and disappear when the server restarts: fine for a quick preview, not for real users.

## 4. Test
1. `bash scripts/release-ios.sh` → install from TestFlight.
2. Sign in with your sandbox tester when prompted to buy; renewals run every few minutes in sandbox.
3. Check: the coach shows **x/30 left**, Settings shows **Wellbeing Plus: active**, Restore purchases works after reinstalling.
