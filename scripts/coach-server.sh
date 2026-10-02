#!/usr/bin/env bash
# Helper for the Wellbeing AI coach server. Run from the Replit shell.
#
#   bash scripts/coach-server.sh check            install, typecheck, unit tests
#   bash scripts/coach-server.sh try              start locally and ask one real question (uses your API key)
#   bash scripts/coach-server.sh set-url <URL>    point the app at your deployed server
#   bash scripts/coach-server.sh set-rc-key <KEY> add the RevenueCat public iOS key (appl_...)
set -euo pipefail
cd "$(dirname "$0")/.."
step() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

case "${1:-}" in
  check)
    step "Installing server dependencies"
    (cd server && npm ci)
    step "Type-checking"
    (cd server && npm run typecheck)
    step "Running unit tests"
    (cd server && npm test)
    echo "Server checks passed."
    ;;

  try)
    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
      echo "ANTHROPIC_API_KEY is not set. Add it in Replit: Tools → Secrets → ANTHROPIC_API_KEY"; exit 1
    fi
    (cd server && npm ci --silent)
    step "Starting server on port 3999"
    (cd server && PORT=3999 npx tsx src/index.ts) & PID=$!
    trap 'kill $PID 2>/dev/null' EXIT
    for _ in $(seq 1 20); do curl -fs localhost:3999/health >/dev/null 2>&1 && break; sleep 1; done
    curl -fs localhost:3999/health; echo
    PROFILE='{"focus":["stress","sleep"],"style":"gentle","stressResponse":"overthink","recharge":["nature"]}'
    CONTEXT='{"localHour":21,"streak":3,"recentMoods":[{"daysAgo":0,"mood":"bad"},{"daysAgo":1,"mood":"okay"}],"latestCheckIn":{"daysAgo":0,"sleep":2,"energy":2,"stress":4}}'
    step "Asking for personalised questions"
    curl -fs -X POST localhost:3999/coach/suggestions -H 'content-type: application/json' -H 'x-device-id: replit-test-device-01' \
      -d "{\"profile\":$PROFILE,\"context\":$CONTEXT}"; echo
    step "Asking one question"
    curl -fs -X POST localhost:3999/coach/ask -H 'content-type: application/json' -H 'x-device-id: replit-test-device-01' \
      -d "{\"profile\":$PROFILE,\"context\":$CONTEXT,\"question\":\"Why do I feel so wound up at night?\"}"; echo
    ;;

  set-url)
    URL="${2:-}"; URL="${URL%/}"
    if [[ ! "$URL" =~ ^https:// ]]; then echo "Usage: bash scripts/coach-server.sh set-url https://your-app.replit.app"; exit 1; fi
    step "Checking $URL/health"
    curl -fsS "$URL/health" || { echo "Server did not respond. Is the deployment running?"; exit 1; }
    echo
    node -e '
      const fs = require("fs");
      const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
      app.expo.extra = { ...(app.expo.extra || {}), coachApiUrl: process.argv[1] };
      fs.writeFileSync("app.json", JSON.stringify(app, null, 2) + "\n");
    ' "$URL"
    echo "app.json now points to $URL"
    echo "Commit it:  git commit -am 'Point app at coach server' && git push"
    ;;

  set-rc-key)
    KEY="${2:-}"
    if [[ ! "$KEY" =~ ^appl_ ]]; then echo "Usage: bash scripts/coach-server.sh set-rc-key appl_xxxxx  (RevenueCat → API keys → public iOS key)"; exit 1; fi
    node -e '
      const fs = require("fs");
      const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
      app.expo.extra = { ...(app.expo.extra || {}), revenueCatIosKey: process.argv[1] };
      fs.writeFileSync("app.json", JSON.stringify(app, null, 2) + "\n");
    ' "$KEY"
    echo "app.json now has the RevenueCat key. Commit it:  git commit -am 'Add RevenueCat key' && git push"
    ;;

  *)
    sed -n '2,8p' "$0"; exit 1 ;;
esac
