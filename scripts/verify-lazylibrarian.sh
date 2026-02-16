#!/usr/bin/env bash
# Verify LazyLibrarian support: caps, version, v1 endpoints (query/command), t=book
# Usage: ./scripts/verify-lazylibrarian.sh [BASE_URL] [API_KEY]
# Example: ./scripts/verify-lazylibrarian.sh http://localhost:3000
# Example: ./scripts/verify-lazylibrarian.sh http://localhost:3000 mypassword

set -e
BASE="${1:-http://localhost:3000}"
APIKEY="${2:-}"
AUTH="${APIKEY:+&apikey=$APIKEY}"

echo "=== LazyLibrarian verification (BASE=$BASE) ==="

# 1. Caps: book-search + categories 7020/7040
echo -n "1. Torznab caps... "
CAPS=$(curl -sS "${BASE}/api?t=caps${AUTH}")
if echo "$CAPS" | grep -q 'book-search available="yes"'; then
  echo "OK (book-search)"
else
  echo "FAIL: book-search not found"
  exit 1
fi
if echo "$CAPS" | grep -q 'supportedParams="q,author,title"'; then
  echo "   OK (supportedParams)"
else
  echo "   FAIL: supportedParams q,author,title not found"
  exit 1
fi
if echo "$CAPS" | grep -qE 'id="7020"|id="7040"'; then
  echo "   OK (categories 7020/7040)"
else
  echo "   FAIL: categories 7020/7040 not found"
  exit 1
fi

# 2. Version (v2 endpoint used by *arr apps)
echo -n "2. GET /api/v2/app/version... "
VERSION_URL="${BASE}/api/v2/app/version${APIKEY:+?apikey=$APIKEY}"
VER=$(curl -sS -o /dev/null -w "%{http_code}" "$VERSION_URL")
if [ "$VER" = "200" ]; then
  BODY=$(curl -sS "$VERSION_URL")
  if [ -n "$BODY" ]; then
    echo "OK (200, version=$BODY)"
  else
    echo "FAIL: empty body"
    exit 1
  fi
else
  echo "FAIL: HTTP $VER"
  exit 1
fi

# 2b. Version (v1 endpoint used by LazyLibrarian)
echo -n "2b. GET /version/api (v1, integer)... "
V1VER_URL="${BASE}/version/api${APIKEY:+?apikey=$APIKEY}"
V1VER_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$V1VER_URL")
if [ "$V1VER_HTTP" = "200" ]; then
  V1VER_BODY=$(curl -sS "$V1VER_URL")
  if echo "$V1VER_BODY" | grep -qE '^[0-9]+$'; then
    echo "OK (200, api_version=$V1VER_BODY)"
  else
    echo "FAIL: expected integer, got '$V1VER_BODY'"
    exit 1
  fi
else
  echo "FAIL: HTTP $V1VER_HTTP"
  exit 1
fi

# 3. t=book
echo -n "3. Torznab t=book... "
BOOK_URL="${BASE}/api?t=book&q=test${AUTH:-}"
BOOK_HTTP=$(curl -sS -o /tmp/book.xml -w "%{http_code}" "$BOOK_URL")
if [ "$BOOK_HTTP" = "200" ]; then
  if grep -q '<rss' /tmp/book.xml && grep -q 'torznab:response' /tmp/book.xml; then
    echo "OK (200, valid RSS)"
  else
    echo "FAIL: invalid RSS"
    exit 1
  fi
else
  echo "FAIL: HTTP $BOOK_HTTP"
  exit 1
fi

# 4. query/torrents (v1 API used by LazyLibrarian for download status)
echo -n "4. GET /query/torrents... "
QUERY_URL="${BASE}/query/torrents${APIKEY:+?apikey=$APIKEY}"
QUERY_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$QUERY_URL")
if [ "$QUERY_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $QUERY_HTTP"
  exit 1
fi

# 5. Pause (v2)
echo -n "5. POST /api/v2/torrents/pause (v2)... "
PAUSE_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/v2/torrents/pause?hashes=00000000000000000000000000000000")
if [ "$PAUSE_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $PAUSE_HTTP"
  exit 1
fi

# 5b. Pause (v1 - used by LazyLibrarian)
echo -n "5b. POST /command/pause (v1)... "
PAUSE_V1_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -d "hash=00000000000000000000000000000000" "${BASE}/command/pause")
if [ "$PAUSE_V1_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $PAUSE_V1_HTTP"
  exit 1
fi

# 6. Resume (v2)
echo -n "6. POST /api/v2/torrents/resume (v2)... "
RESUME_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/v2/torrents/resume?hashes=00000000000000000000000000000000")
if [ "$RESUME_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $RESUME_HTTP"
  exit 1
fi

# 6b. Resume (v1 - used by LazyLibrarian)
echo -n "6b. POST /command/resume (v1)... "
RESUME_V1_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -d "hash=00000000000000000000000000000000" "${BASE}/command/resume")
if [ "$RESUME_V1_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $RESUME_V1_HTTP"
  exit 1
fi

# 7. Magazine category (8030) in caps
echo -n "7. Torznab caps magazine category... "
if echo "$CAPS" | grep -q 'id="8030"'; then
  echo "OK (category 8030 Magazines)"
else
  echo "FAIL: category 8030 Magazines not found"
  exit 1
fi

# 8. GET /query/preferences (v1 - used by LazyLibrarian getFolder())
echo -n "8. GET /query/preferences (v1)... "
PREF_URL="${BASE}/query/preferences${APIKEY:+?apikey=$APIKEY}"
PREF_HTTP=$(curl -sS -o /tmp/prefs.json -w "%{http_code}" "$PREF_URL")
if [ "$PREF_HTTP" = "200" ]; then
  if grep -q '"save_path"' /tmp/prefs.json && grep -q '"temp_path"' /tmp/prefs.json; then
    echo "OK (200, has save_path + temp_path)"
  else
    echo "FAIL: missing save_path or temp_path in response"
    exit 1
  fi
else
  echo "FAIL: HTTP $PREF_HTTP"
  exit 1
fi

# 9. POST /command/delete (v1 - used by LazyLibrarian removeTorrent)
echo -n "9. POST /command/delete (v1)... "
DEL_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -d "hash=00000000000000000000000000000000" "${BASE}/command/delete")
if [ "$DEL_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $DEL_HTTP"
  exit 1
fi

# 10. POST /command/deletePerm (v1 - used by LazyLibrarian removeTorrent with data)
echo -n "10. POST /command/deletePerm (v1)... "
DELPERM_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -d "hash=00000000000000000000000000000000" "${BASE}/command/deletePerm")
if [ "$DELPERM_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $DELPERM_HTTP"
  exit 1
fi

# 11. GET /query/propertiesGeneral/{hash} (v1 - used by LazyLibrarian getFolder())
echo -n "11. GET /query/propertiesGeneral/{hash} (v1)... "
PROPS_URL="${BASE}/query/propertiesGeneral/00000000000000000000000000000000${APIKEY:+?apikey=$APIKEY}"
PROPS_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$PROPS_URL")
if [ "$PROPS_HTTP" = "200" ] || [ "$PROPS_HTTP" = "404" ]; then
  echo "OK (HTTP $PROPS_HTTP - endpoint exists)"
else
  echo "FAIL: HTTP $PROPS_HTTP"
  exit 1
fi

# 12. GET /query/propertiesFiles/{hash} (v1 - used by LazyLibrarian getFiles())
echo -n "12. GET /query/propertiesFiles/{hash} (v1)... "
FILES_URL="${BASE}/query/propertiesFiles/00000000000000000000000000000000${APIKEY:+?apikey=$APIKEY}"
FILES_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$FILES_URL")
if [ "$FILES_HTTP" = "200" ] || [ "$FILES_HTTP" = "404" ]; then
  echo "OK (HTTP $FILES_HTTP - endpoint exists)"
else
  echo "FAIL: HTTP $FILES_HTTP"
  exit 1
fi

# 13. POST /command/delete with 'hashes' field (v1 - used by LazyLibrarian removeTorrent)
echo -n "13. POST /command/delete with hashes field (v1)... "
DEL_HASHES_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -d "hashes=00000000000000000000000000000000" "${BASE}/command/delete")
if [ "$DEL_HASHES_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $DEL_HASHES_HTTP"
  exit 1
fi

echo ""
echo "=== All LazyLibrarian checks passed ==="
