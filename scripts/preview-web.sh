#!/usr/bin/env bash
# Preview the Wellbeing app in a browser from Replit, with the AI coach working.
#   bash scripts/preview-web.sh
# Then open the Webview tab (or the https://...replit.dev URL Replit shows).
#
# The browser preview is for checking screens and flows. Native-only features
# (pop-up alerts, reminders, Face ID, calling a number) only work on a phone.
set -euo pipefail
cd "$(dirname "$0")/.."
step() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

PORT="${PORT:-3000}"
if [ -n "${REPLIT_DEV_DOMAIN:-}" ]; then
  URL="https://$REPLIT_DEV_DOMAIN"
else
  URL="http://localhost:$PORT"
fi

[ -n "${ANTHROPIC_API_KEY:-}" ] || echo "Note: ANTHROPIC_API_KEY is not set, so the coach will say it is unavailable. Add it in Tools → Secrets."

step "Installing app and server dependencies"
npm ci --no-audit --no-fund
(cd server && npm ci --no-audit --no-fund)

step "Building the web version (coach → $URL)"
EXPO_PUBLIC_COACH_API_URL="$URL" npx expo export --platform web --clear --output-dir dist

step "Starting preview on port $PORT"
echo "Open: $URL"
cd server && WEB_DIST=../dist PORT="$PORT" npx tsx src/index.ts
