#!/usr/bin/env bash
# Pulls the droplet's rotating pg_dump backups down to a local archive.
# Local copy is append-only (no --delete), so it accumulates history beyond
# the droplet's own 7-dump retention window.
set -euo pipefail

DROPLET_HOST="root@138.197.87.22"
SSH_KEY="$HOME/.ssh/newinvoice_droplet"
REMOTE_DIR="/opt/newinvoice/backups/"
LOCAL_DIR="/Users/uzair/Projects/newinvoice/backups/"

mkdir -p "$LOCAL_DIR"

rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=yes -o ConnectTimeout=15" \
  "$DROPLET_HOST:$REMOTE_DIR" "$LOCAL_DIR"

echo "Pulled backups into $LOCAL_DIR"
ls -lh "$LOCAL_DIR"
