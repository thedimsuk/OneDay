#!/usr/bin/env sh
set -eu

# setup-gais: unified DB installer + setup for Arch/Fedora/Debian (and Ubuntu)
# - installs MariaDB server & client
# - initializes data dir if needed
# - enables & starts service
# - creates database and user
# - updates .env DATABASE_URL
# - installs npm deps and runs project db setup (prisma + seeds)

cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-oneday}"
DB_USER="${DB_USER:-oneday}"
DB_PASSWORD="${DB_PASSWORD:-oneday_dev_password}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

# Safety checks
case "$DB_NAME" in
  *[!A-Za-z0-9_]*|"") echo "DB_NAME hanya boleh huruf, angka, dan underscore."; exit 1 ;;
esac
case "$DB_USER" in
  *[!A-Za-z0-9_]*|"") echo "DB_USER hanya boleh huruf, angka, dan underscore."; exit 1 ;;
esac
case "$DB_PASSWORD" in
  *"'"*) echo "DB_PASSWORD tidak boleh mengandung tanda petik tunggal."; exit 1 ;;
esac

HOST_SPAWN=""
if ! command -v sudo >/dev/null 2>&1 && [ -x /app/bin/host-spawn ]; then
  HOST_SPAWN="/app/bin/host-spawn"
fi

host_sh() {
  if [ -n "$HOST_SPAWN" ]; then
    "$HOST_SPAWN" sh -lc "$1"
  else
    sh -lc "$1"
  fi
}

if ! host_sh "command -v sudo >/dev/null 2>&1"; then
  echo "sudo tidak ditemukan di host. Jalankan skrip ini dari terminal Linux host yang memiliki sudo."
  exit 1
fi

# Detect OS / package manager
DISTRO="unknown"
if host_sh "command -v pacman >/dev/null 2>&1"; then
  DISTRO="arch"
  INSTALL_CMD="sudo pacman -S --needed --noconfirm mariadb"
elif host_sh "command -v dnf >/dev/null 2>&1"; then
  DISTRO="fedora"
  INSTALL_CMD="sudo dnf install -y mariadb-server mariadb"
elif host_sh "command -v apt-get >/dev/null 2>&1"; then
  DISTRO="debian"
  INSTALL_CMD="sudo DEBIAN_FRONTEND=noninteractive apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server mariadb-client"
else
  echo "Distribusi/manager paket tidak terdeteksi (didukung: pacman, dnf, apt-get)."
  exit 1
fi

echo "Detected distro: $DISTRO"

echo "Installing MariaDB packages (this may take a while)..."
host_sh "$INSTALL_CMD"

# Initialize DB data dir if tools present
if host_sh "command -v mariadb-install-db >/dev/null 2>&1"; then
  echo "Running mariadb-install-db if necessary..."
  host_sh "sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql || true"
elif host_sh "command -v mysql_install_db >/dev/null 2>&1"; then
  echo "Running mysql_install_db if necessary..."
  host_sh "sudo mysql_install_db --user=mysql --basedir=/usr --datadir=/var/lib/mysql || true"
else
  echo "No mariadb-install-db/mysql_install_db found; skipping initialization step."
fi

# Start service
echo "Enabling and starting MariaDB service..."
if ! host_sh "sudo systemctl enable --now mariadb >/dev/null 2>&1"; then
  echo "Trying alternate service name 'mysql'..."
  host_sh "sudo systemctl enable --now mysql || true"
fi

# Wait a bit for service
sleep 2

# Create DB and user
SQL="
CREATE DATABASE IF NOT EXISTS \\`$DB_NAME\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \\`$DB_NAME\\`.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON \\`$DB_NAME\\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
"

echo "Creating database and user..."
if [ -n "$HOST_SPAWN" ]; then
  printf '%s
' "$SQL" | "$HOST_SPAWN" sudo mariadb || printf '%s
' "$SQL" | "$HOST_SPAWN" sudo mysql
else
  printf '%s
' "$SQL" | sudo mariadb || printf '%s
' "$SQL" | sudo mysql
fi

DATABASE_URL="******$DB_HOST:$DB_PORT/$DB_NAME"

# Ensure .env present
if [ ! -f .env ]; then
  cp .env.example .env
fi

if grep -q '^DATABASE_URL=' .env; then
  tmp_file="$(mktemp)"
  sed "s#^DATABASE_URL=.*#DATABASE_URL=\"$DATABASE_URL\"#" .env > "$tmp_file"
  mv "$tmp_file" .env
else
  printf '\nDATABASE_URL="%s"\n' "$DATABASE_URL" >> .env
fi

echo "DATABASE_URL di .env sudah disetel ke: $DATABASE_URL"

# Install node deps if needed
if command -v npm >/dev/null 2>&1; then
  echo "Installing npm dependencies..."
  npm install
else
  echo "npm tidak ditemukan di PATH. Pastikan Node.js & npm terinstall pada host sebelum melanjutkan. Skrip akan coba lanjut jika .tools/node tersedia."
  if [ -x .tools/node/bin/npm ]; then
    PATH="$PWD/.tools/node/bin:$PATH"
    export PATH
    echo "Using bundled .tools/node/bin/npm"
    npm install
  else
    echo "npm tidak ditemukan dan tidak ada .tools/node; hentikan di sini."
    exit 1
  fi
fi

# Run project DB setup (prisma generate/push + seeds)
echo "Running project db setup (prisma + seeds)..."
npm run db:setup

# Post-setup message
cat <<EOF
Setup selesai.
- DATABASE_URL: $DATABASE_URL
- Database user: $DB_USER
- Run the app with: npm run dev:user  (and npm run dev:admin in another terminal)
EOF
