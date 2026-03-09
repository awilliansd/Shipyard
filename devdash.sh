#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load nvm if available (needed when launched from .desktop shortcut)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Detect OS for browser open command
open_browser() {
  sleep 4
  if command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:5421" 2>/dev/null
  elif command -v open &>/dev/null; then
    open "http://localhost:5421"
  fi
}

open_browser &
pnpm dev
