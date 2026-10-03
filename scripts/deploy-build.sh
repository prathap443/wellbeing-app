#!/usr/bin/env bash
# Build step for publishing on Replit: builds the web app and installs the server.
# The published server then serves the web app, the AI coach and accounts from one address.
#
# Replit → Publishing → Reserved VM:
#   Build command:  bash scripts/deploy-build.sh
#   Run command:    cd server && WEB_DIST=../dist npm start
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --no-audit --no-fund
npx expo export --platform web --output-dir dist
(cd server && npm ci --no-audit --no-fund)
echo "Build complete."
