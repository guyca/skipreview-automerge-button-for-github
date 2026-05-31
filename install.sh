#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/guyca/skipreview-automerge-button-for-github.git"
INSTALL_DIR="${INSTALL_DIR:-$HOME/skipreview-automerge-button-for-github}"

if ! command -v yarn &>/dev/null; then
  echo "Error: yarn not found. Install it first: https://yarnpkg.com/getting-started/install" >&2
  exit 1
fi

if [ -d "$INSTALL_DIR" ]; then
  echo "Error: $INSTALL_DIR already exists. Remove it or set INSTALL_DIR to a different path." >&2
  exit 1
fi

echo "This will clone the repo into: $INSTALL_DIR"
read -r -p "Continue? [y/N] " confirm </dev/tty
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Cloning into $INSTALL_DIR..."
git clone "$REPO_URL" "$INSTALL_DIR"

echo "Building..."
cd "$INSTALL_DIR"
yarn install && yarn build

DIST="$INSTALL_DIR/dist"
echo ""
echo "Done! Load the extension in Chrome:"
echo "  1. Open chrome://extensions/"
echo "  2. Enable Developer mode (top-right toggle)"
echo "  3. Click 'Load unpacked' and select:"
echo "     $DIST"
