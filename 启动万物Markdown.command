#!/bin/zsh

set -e

cd "$(dirname "$0")"

APP_DIR="$HOME/Library/Application Support/WanwuMarkdown"
AGENT="$HOME/Library/LaunchAgents/com.wanwu.markdown.plist"

if [ ! -d node_modules ]; then
  npm install
fi

mkdir -p "$APP_DIR/captures"
rsync -a --delete public/ "$APP_DIR/public/"
rsync -a --delete src/ "$APP_DIR/src/"
rsync -a --delete node_modules/ "$APP_DIR/node_modules/"
rsync -a package.json package-lock.json "$APP_DIR/"

if ! curl -fsS --max-time 2 http://localhost:4173/api/health >/dev/null 2>&1; then
  if [ -f "$AGENT" ]; then
    launchctl kickstart -k "gui/$UID/com.wanwu.markdown" >/dev/null 2>&1 || \
      launchctl bootstrap "gui/$UID" "$AGENT"
  else
    cd "$APP_DIR"
    nohup npm start > captures/workbench.log 2>&1 &
  fi

  for _ in {1..30}; do
    if curl -fsS --max-time 2 http://localhost:4173/api/health >/dev/null 2>&1; then
      break
    fi
    sleep 0.3
  done
fi

open http://localhost:4173
