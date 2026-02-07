#!/bin/bash
# Patch LazyLibrarian for "can only concatenate str (not bytes) to str" when adding magnet links.
# Bug: In calculate_torrent_hash(), b16encode() returns bytes in Python 3, causing str+bytes error.
# Fix: Add .decode() so the hash is a string before concatenation.
#
# Requirements: GNU sed (usually available in Linux containers; BSD sed not supported)
# Usage: ./scripts/patch-lazylibrarian-torrent-hash.sh [container_name]
# Default container name: lazylibrarian

CONTAINER="${1:-lazylibrarian}"

# LinuxServer LazyLibrarian path
FILE="/app/lazylibrarian/lazylibrarian/downloadmethods.py"

echo "Patching LazyLibrarian in container: $CONTAINER"
echo "File: $FILE"

# Check if the patch has already been applied to avoid modifying the file multiple times.
if docker exec "$CONTAINER" grep -q \
  'b16encode(b32decode(torrent_hash)).decode().lower()' "$FILE" 2>/dev/null; then
  echo "Patch already applied. No changes made."
  exit 0
fi

# Apply the patch, restricting the substitution to the first occurrence (requires GNU sed).
docker exec "$CONTAINER" sed -i \
  '0,/b16encode(b32decode(torrent_hash)).lower()/s//b16encode(b32decode(torrent_hash)).decode().lower()/' \
  "$FILE" && echo "Patch applied. Restart LazyLibrarian to ensure the fix is loaded." \
  || echo "Patch failed. Check container name and that LazyLibrarian is running."
