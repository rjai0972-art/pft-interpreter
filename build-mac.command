#!/bin/bash
# Double-click to build the Mac app on this Mac. Needs Node.js (free, one-time): https://nodejs.org
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Opening the download page: choose the LTS installer, then double-click this file again."
  open "https://nodejs.org"
  read -r -p "Press Return to close. " _
  exit 1
fi
echo "Installing build tools (first time takes a few minutes)..."
npm install || { echo "npm install failed."; read -r -p "Press Return to close. " _; exit 1; }
npm test || { echo "Self-check failed."; read -r -p "Press Return to close. " _; exit 1; }
npm run dist:mac || { echo "Build failed."; read -r -p "Press Return to close. " _; exit 1; }
echo
echo "Done. The installers are in the dist folder."
open dist
read -r -p "Press Return to close. " _
