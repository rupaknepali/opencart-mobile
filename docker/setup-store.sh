#!/bin/sh
# Creates the local OpenCart 4.1.0.4 development store in ./store (not committed) and installs it
# with the demo data, using the credentials in .env. Run from anywhere:
#
#   cp .env.example .env    # set the passwords first
#   make store              # or: sh docker/setup-store.sh
#
# Development only — not a production setup.
set -eu

cd "$(dirname "$0")/.."

OC_VERSION=4.1.0.4

if [ ! -f .env ]; then
	echo "Copy .env.example to .env and set the passwords first." >&2
	exit 1
fi

set -a
. ./.env
set +a

PORT="${STORE_PORT:-8090}"

for name in DB_NAME DB_USER DB_PASSWORD DB_ROOT_PASSWORD ADMIN_USER ADMIN_PASSWORD; do
	eval "value=\${$name:-}"
	if [ -z "$value" ]; then
		echo "$name is empty in .env" >&2
		exit 1
	fi
done

if [ -e store/index.php ]; then
	echo "store/ already contains an OpenCart install. Delete store/ (and run 'docker compose down -v' to drop its database) to start over." >&2
	exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading OpenCart $OC_VERSION..."
curl -fsSL -o "$tmp/opencart.zip" "https://github.com/opencart/opencart/archive/refs/tags/$OC_VERSION.zip"
unzip -q "$tmp/opencart.zip" -d "$tmp"

mkdir -p store
cp -R "$tmp/opencart-$OC_VERSION/upload/." store/
mv store/config-dist.php store/config.php
mv store/admin/config-dist.php store/admin/config.php

echo "Starting the containers..."
docker compose up -d --build --wait

echo "Installing OpenCart..."
output="$(docker compose exec -T web php install/cli_install.php install \
	--username "$ADMIN_USER" \
	--password "$ADMIN_PASSWORD" \
	--email admin@example.com \
	--http_server "http://localhost:$PORT/" \
	--language en-gb \
	--db_driver mysqli \
	--db_hostname db \
	--db_username "$DB_USER" \
	--db_password "$DB_PASSWORD" \
	--db_database "$DB_NAME" \
	--db_port 3306 \
	--db_prefix oc_ 2>&1)"
echo "$output"

if ! echo "$output" | grep -qi "success"; then
	echo "The OpenCart installer did not report success (see above)." >&2
	exit 1
fi

rm -rf store/install

cp docker/make-host-dynamic.php store/
docker compose exec -T web php make-host-dynamic.php "localhost:$PORT"
rm -f store/make-host-dynamic.php

cat <<EOF

Done.
  Storefront  http://localhost:$PORT/
  Admin       http://localhost:$PORT/admin/   (user: $ADMIN_USER, password: ADMIN_PASSWORD in .env)

Next: build and install the Mobile App API extension (make extension, then
Extensions -> Installer in the admin). See README.md.
EOF
