#!/usr/bin/env bash
# Pulls the droplet's rotating pg_dump backups down to a local archive.
# Local copy is append-only (no --delete), so it accumulates history beyond
# the droplet's own 7-dump retention window.
set -euo pipefail

DROPLET_HOST="root@138.197.87.22"
SSH_KEY="$HOME/.ssh/newinvoice_droplet"
REMOTE_DIR="/opt/newinvoice/backups/"
LOCAL_DIR="/Users/uzair/Projects/newinvoice/backups/"
STATE_FILE="$LOCAL_DIR.last_pull_date"

mkdir -p "$LOCAL_DIR"

# Once-per-day guard: macOS launchd's StartCalendarInterval has been
# observed to silently drop a scheduled fire (no error, no spawn — caught
# via `log show` mid-Background-Task-Management rescan) with no relation to
# sleep/wake. The launchd plist now fires this script at both 1pm and 2pm on
# weekdays as a same-day retry; this stamp file is what makes the 2pm run a
# no-op when 1pm already succeeded, rather than a redundant second pull.
# Applies to every invocation (scheduled, RunAtLoad, manual) — a run at any
# time satisfies the day, so a later scheduled slot always sees "already
# done" and a fresh day always sees "not yet done" regardless of trigger.
TODAY="$(date +%Y-%m-%d)"
if [[ -f "$STATE_FILE" ]] && [[ "$(cat "$STATE_FILE")" == "$TODAY" ]]; then
  echo "Already pulled today ($TODAY) — skipping."
  exit 0
fi

rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=yes -o ConnectTimeout=15" \
  "$DROPLET_HOST:$REMOTE_DIR" "$LOCAL_DIR"

echo "$TODAY" > "$STATE_FILE"

echo "Pulled backups into $LOCAL_DIR"
ls -lh "$LOCAL_DIR"
