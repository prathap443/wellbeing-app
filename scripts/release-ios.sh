#!/usr/bin/env bash
# Build Wellbeing for iOS with EAS and submit it to App Store Connect / TestFlight.
# Run from the Replit shell (or any machine with Node 20+):  bash scripts/release-ios.sh
#
# Needs: an Expo account (free) and an Apple Developer Program membership.
# EAS builds on Expo's macOS servers, so no Mac or Xcode is required.
set -euo pipefail

BRANCH="${BRANCH:-claude/gifted-hamilton-lkjivb}"
step() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

cd "$(dirname "$0")/.."

step "Fetching latest code from branch $BRANCH"
if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit or stash them first:"
  git status --short
  exit 1
fi
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

step "Installing dependencies"
npm ci

step "Checking Expo SDK dependency versions"
npx expo install --check || { echo "Fix with: npx expo install --fix"; exit 1; }

step "Type-checking"
npx tsc --noEmit

step "Running Expo Doctor"
npx expo-doctor || echo "(warnings above are non-blocking; review them)"

step "Logging in to Expo (skip if already logged in)"
npx eas-cli@latest whoami >/dev/null 2>&1 || npx eas-cli@latest login

step "Linking project to EAS (first run only)"
if ! grep -q '"projectId"' app.json; then
  npx eas-cli@latest init
  echo "eas init added a projectId to app.json; commit it:  git commit -am 'Link EAS project' && git push"
fi

step "Building for iOS and submitting to App Store Connect"
echo "EAS will ask for your Apple ID and create certificates/profiles for you."
echo "It will also create the app record in App Store Connect if needed."
npx eas-cli@latest build --platform ios --profile production --auto-submit

step "Done"
echo "When processing finishes (~10-30 min) the build appears in TestFlight."
echo "Then complete the listing in App Store Connect and press 'Submit for Review'."
echo "See docs/APP_STORE.md for the listing text and review notes."
