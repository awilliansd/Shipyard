#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load nvm if available (needed when launched from .desktop shortcut)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Wait for server to start, then open browser
(sleep 4 && xdg-open "http://localhost:5421" 2>/dev/null) &

pnpm dev
