#!/bin/bash
# Patch LazyLibrarian for "can only concatenate str (not bytes) to str" when adding magnet links.
# Bug: In calculate_torrent_hash(), b16encode() returns bytes in Python 3, causing str+bytes error.
# Fix: Add .decode() so the hash is a string before concatenation.
#
# Usage: ./scripts/patch-lazylibrarian-torrent-hash.sh [container_name]
# Default container name: lazylibrarian

CONTAINER="${1:-lazylibrarian}"

# LinuxServer LazyLibrarian path
FILE="/app/lazylibrarian/lazylibrarian/downloadmethods.py"

echo "Patching LazyLibrarian in container: $CONTAINER"
echo "File: $FILE"

docker exec "$CONTAINER" sed -i \
  's/b16encode(b32decode(torrent_hash)).lower()/b16encode(b32decode(torrent_hash)).decode().lower()/' \
  "$FILE" && echo "Patch applied. Restart LazyLibrarian to ensure the fix is loaded." \
  || echo "Patch failed. Check container name and that LazyLibrarian is running."
