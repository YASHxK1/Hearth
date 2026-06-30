#!/usr/bin/env sh
set -eu

BASE_URL="http://localhost:11434"
TAGS_URL="http://localhost:11434/api/tags"
TIMEOUT_SECONDS=10
LOG_DIR="$HOME/.hearth/logs"
LOG_FILE="$LOG_DIR/ollama.log"

is_ollama_running() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$TAGS_URL" >/dev/null 2>&1
    return $?
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q -O /dev/null "$TAGS_URL" >/dev/null 2>&1
    return $?
  fi

  return 1
}

if is_ollama_running; then
  echo "Ollama is already running at $BASE_URL."
  exit 0
fi

mkdir -p "$LOG_DIR"
nohup ollama serve > "$HOME/.hearth/logs/ollama.log" 2>&1 &

elapsed=0
while [ "$elapsed" -lt "$TIMEOUT_SECONDS" ]; do
  sleep 1
  if is_ollama_running; then
    echo "Ollama started at $BASE_URL."
    echo "Logs: $LOG_FILE"
    exit 0
  fi
  elapsed=$((elapsed + 1))
done

echo "Ollama did not become reachable at $BASE_URL within $TIMEOUT_SECONDS seconds." >&2
echo "Logs: $LOG_FILE" >&2
exit 1
