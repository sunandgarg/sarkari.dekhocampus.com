#!/usr/bin/env bash
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
WORKFLOW="deploy-sarkari-pages.yml"

for command in git gh curl jq; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required command: $command"; exit 1; }
done

CURRENT_BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "You are on '$CURRENT_BRANCH'. Switch to '$BRANCH' before deploying."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Tracked changes are not committed. Commit the intended release before deploying."
  exit 1
fi

git fetch origin "$BRANCH"
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH")" ]; then
  echo "Local $BRANCH and origin/$BRANCH differ. Push or pull before deploying."
  exit 1
fi

SHA="$(git rev-parse HEAD)"
PREVIOUS_RUN="$(gh run list --workflow "$WORKFLOW" --branch "$BRANCH" --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId // empty')"

gh workflow run "$WORKFLOW" --ref "$BRANCH"

RUN_ID=""
for _ in $(seq 1 30); do
  RUN_ID="$(gh run list --workflow "$WORKFLOW" --branch "$BRANCH" --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
  [ -n "$RUN_ID" ] && [ "$RUN_ID" != "$PREVIOUS_RUN" ] && break
  sleep 2
done

[ -n "$RUN_ID" ] || { echo "Could not find the Sarkari deployment run."; exit 1; }
gh run watch "$RUN_ID" --exit-status

curl --fail --silent --show-error --max-time 20 \
  https://sarkari-dekhocampus.pages.dev/version.json \
  | jq -e --arg sha "$SHA" '.buildId == $sha' >/dev/null

echo "Sarkari DekhoCampus deployment complete: $SHA"
