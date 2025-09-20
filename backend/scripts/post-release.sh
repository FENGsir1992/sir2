#!/usr/bin/env bash
set -euo pipefail
RELEASE="${1:-$(readlink -f /www/wwwroot/jr-app/current)}"
SHARED="/www/wwwroot/jr-app/shared/uploads"
mkdir -p "$SHARED"
if [ -d "$RELEASE/backend" ]; then
  rm -rf "$RELEASE/backend/uploads"
  ln -s "$SHARED" "$RELEASE/backend/uploads"
fi
if [ -d "/www/wwwroot/jr-app/current/dist" ]; then
  rm -rf "/www/wwwroot/jr-app/current/dist/uploads"
  ln -s "$SHARED" "/www/wwwroot/jr-app/current/dist/uploads"
fi
echo "OK: release=$RELEASE  shared=$SHARED  $(date)"