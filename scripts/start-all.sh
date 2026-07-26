#!/usr/bin/env sh
set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

LOCAL_NODE_BIN="$PROJECT_ROOT/.tools/node/bin"
if [ -x "$LOCAL_NODE_BIN/npm" ]; then
  PATH="$LOCAL_NODE_BIN:$PATH"
  export PATH
  if ! npm --version >/dev/null 2>&1; then
    echo "Lewati .tools/node/bin/npm karena tidak bisa dijalankan di environment ini."
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm tidak ditemukan di PATH."
  exit 1
fi

PORTS="${PORTS:-3001 3002}"
RUN_DB_SETUP="${RUN_DB_SETUP:-1}"

port_pids() {
  port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null \
      | awk -v port=":$port" '$4 ~ port { print }' \
      | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
      | sort -u
    return 0
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u
    return 0
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "$port"/tcp 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | sort -u
    return 0
  fi

  if [ -x /app/bin/host-spawn ]; then
    /app/bin/host-spawn sh -lc "ss -ltnp 2>/dev/null | awk -v port=':$port' '\$4 ~ port { print }' | sed -n 's/.*pid=\\([0-9][0-9]*\\).*/\\1/p' | sort -u" || true
    return 0
  fi
}

kill_pid() {
  pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    return 0
  fi

  if [ -x /app/bin/host-spawn ]; then
    /app/bin/host-spawn kill "$pid" 2>/dev/null || true
  fi
}

force_kill_pid() {
  pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
    return 0
  fi

  if [ -x /app/bin/host-spawn ]; then
    /app/bin/host-spawn kill -9 "$pid" 2>/dev/null || true
  fi
}

stop_port() {
  port="$1"
  pids="$(port_pids "$port" | tr '\n' ' ')"

  if [ -z "$pids" ]; then
    echo "Port $port sudah bebas."
    return 0
  fi

  echo "Mematikan proses lama di port $port: $pids"
  for pid in $pids; do
    kill_pid "$pid"
  done

  attempt=0
  while [ "$attempt" -lt 20 ]; do
    remaining="$(port_pids "$port" | tr '\n' ' ')"
    if [ -z "$remaining" ]; then
      echo "Port $port sudah bebas."
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 0.25
  done

  echo "Proses di port $port belum berhenti, memaksa stop."
  for pid in $(port_pids "$port"); do
    force_kill_pid "$pid"
  done
}

for port in $PORTS; do
  stop_port "$port"
done

if [ ! -d node_modules ]; then
  npm install
fi

if [ "$RUN_DB_SETUP" = "1" ]; then
  npm run db:setup
else
  echo "Skip db:setup karena RUN_DB_SETUP=$RUN_DB_SETUP."
fi

cleanup() {
  if [ -n "${USER_PID:-}" ]; then
    kill "$USER_PID" 2>/dev/null || true
  fi
  if [ -n "${ADMIN_PID:-}" ]; then
    kill "$ADMIN_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

npm run dev:user &
USER_PID=$!

npm run dev:admin &
ADMIN_PID=$!

echo "User:  http://127.0.0.1:3001"
echo "Admin: http://localhost:3002/admin"
echo "Tekan Ctrl+C untuk menghentikan kedua server."
echo "Gunakan RUN_DB_SETUP=0 npm run start:all untuk restart cepat tanpa db:setup."

wait
