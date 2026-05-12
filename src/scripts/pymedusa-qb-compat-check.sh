#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${1:-http://localhost:3000}"
PASSWORD="${PASSWORD:-}"
ED2K_SAMPLE='ed2k://|file|sample.mkv|1234|0123456789ABCDEF0123456789ABCDEF|/'

echo "== login =="
curl -sS -X POST "$BASE_URL/api/v2/auth/login" -d "password=$PASSWORD"
echo

echo "== app version =="
curl -sS "$BASE_URL/api/v2/app/version"; echo
curl -sS "$BASE_URL/api/v2/app/webapiVersion"; echo
curl -sS "$BASE_URL/api/v2/app/preferences"; echo

echo "== categories =="
curl -sS -X POST "$BASE_URL/api/v2/torrents/createCategory" -d "category=medusa"; echo
curl -sS "$BASE_URL/api/v2/torrents/categories"; echo

echo "== add ed2k =="
curl -sS -X POST "$BASE_URL/api/v2/torrents/add" --data-urlencode "urls=$ED2K_SAMPLE" -d "category=medusa" -d "savepath=/downloads/complete"; echo

echo "== info =="
curl -sS "$BASE_URL/api/v2/torrents/info?category=medusa"; echo
