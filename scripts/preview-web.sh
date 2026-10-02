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

# Use the port Replit maps to the public preview URL (externalPort = 80 in .replit).
if [ -z "${PORT:-}" ] && [ -f .replit ]; then
  PORT=$(awk '/^\[\[ports\]\]/{lp=""} /localPort/{gsub(/[^0-9]/,"");lp=$0} /externalPort *= *80$/{if(lp!=""){print lp; exit}}' .replit)
fi
PORT="${PORT:-3000}"
if [ -n "${REPLIT_DEV_DOMAIN:-}" ]; then
  URL="https://$REPLIT_DEV_DOMAIN"
else
  URL="http://localhost:$PORT"
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Note: ANTHROPIC_API_KEY is not set, so the coach will say it is unavailable."
  echo "      Add a secret named exactly ANTHROPIC_API_KEY in Tools → Secrets, then open a NEW Shell tab and re-run."
fi

if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "Port $PORT is already in use (probably the old preview). Press Stop in Replit, or run:  pkill -f 'expo start'"
  exit 1
fi

step "Installing app and server dependencies"
npm ci --no-audit --no-fund
(cd server && npm ci --no-audit --no-fund)

step "Building the web version (coach → $URL)"
EXPO_PUBLIC_COACH_API_URL="$URL" npx expo export --platform web --clear --output-dir dist

step "Starting preview on port $PORT"
echo "Open: $URL"
cd server && WEB_DIST=../dist PORT="$PORT" npx tsx src/index.ts
