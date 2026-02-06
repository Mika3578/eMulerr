#!/usr/bin/env bash
# Verify LazyLibrarian support: caps, version, t=book, pause/resume
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

# 2. Version
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

# 4. Pause
echo -n "4. POST /api/v2/torrents/pause... "
PAUSE_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/v2/torrents/pause?hashes=00000000000000000000000000000000")
if [ "$PAUSE_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $PAUSE_HTTP"
  exit 1
fi

# 5. Resume
echo -n "5. POST /api/v2/torrents/resume... "
RESUME_HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/v2/torrents/resume?hashes=00000000000000000000000000000000")
if [ "$RESUME_HTTP" = "200" ]; then
  echo "OK (200)"
else
  echo "FAIL: HTTP $RESUME_HTTP"
  exit 1
fi

echo ""
echo "=== All LazyLibrarian checks passed ==="
