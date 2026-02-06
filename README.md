# eMulerr

Seamless integration for eD2k/KAD (eMule) networks and Radarr/Sonarr, enjoy.

[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/r/isc30/emulerr)

## Running the container

Add the following service to your docker-compose:

```yml
services:
  emulerr:
    image: isc30/emulerr:latest
    container_name: emulerr
    restart: unless-stopped
    tty: true
    environment:
      # - PUID=1000 # optional
      # - PGID=1000 # optional
      # - PORT=3000 # optional, web-ui port
      # - ED2K_PORT=4662 # optional, only required when exposing a non-standard port
      # - LOG_LEVEL=info # optional
      # - PASSWORD=1234 # optional, user=emulerr
    ports:
      - "3000:3000" # web ui
      - "4662:4662" # ed2k tcp
      - "4662:4662/udp" # ed2k udp
      # - "4665:4665/udp" # optional, ed2k global search udp (tcp port +3)
    volumes:
      - ./config:/config # required
      - ./downloads:/downloads # required
      # - ./shared:/shared:ro # optional, extra files to be shared via ed2k/kad
```

(Optional) Add eMulerr as a dependency for Radarr, Sonarr, etc:

```diff
 radarr:
   image: lscr.io/linuxserver/radarr:latest
+  depends_on:
+    emulerr:
+      condition: service_healthy
```

## Configuring *rr

In order to get started, configure the Download Client in *RR:

- Type: `qBittorrent`
- Name: `emulerr`
- Host: `emulerr`
- Port: `3000`
- Username (if using PASSWORD): `emulerr`
- Password (if using PASSWORD): `PASSWORD` (from environment variable)
- Priority: `50`

Also set the Download Client's `Remote Path Mappings`:

- Host: `emulerr`
- Remote Path: `/downloads`
- Local Path: `{The /downloads folder inside MOUNTED PATH FOR RADARR}`

Then, add a new Indexer in *RR:

- Type: `Torznab`
- Name: `emulerr`
- RSS: `No`
- Automatic Search: `No`
- Interactive Search: `Yes`
- URL: `http://emulerr:3000/`
- API Key (if using PASSWORD): `PASSWORD` (from environment variable)
- Download Client: `emulerr`

## LazyLibrarian (ebooks, magazines, audiobooks)

eMulerr supports LazyLibrarian for books, magazines, and audiobooks via the eD2K/KAD network.

### Docker Compose

Add LazyLibrarian with eMulerr as dependency:

```yml
lazylibrarian:
  container_name: lazylibrarian
  image: lscr.io/linuxserver/lazylibrarian:latest
  ports:
    - 5299:5299
  environment:
    - PUID=1000
    - PGID=1000
    - TZ=UTC
  volumes:
    - ./lazylibrarian-config:/config
    - ./downloads:/downloads
    - ./books:/books
  restart: unless-stopped
  depends_on:
    emulerr:
      condition: service_healthy
```

### Download Client (qBittorrent)

In LazyLibrarian: **Config → Download Clients**

- Type: `qBittorrent`
- Name: `emulerr`
- Host: `emulerr`
- Port: `3000`
- Username: `emulerr`
- Password: `PASSWORD` (from eMulerr env)
- Priority: `50`

**Remote Path Mappings:**

- Host: `emulerr`
- Remote Path: `/downloads`
- Local Path: `/downloads` (or LazyLibrarian's download folder path)

### Torznab Indexer

In LazyLibrarian: **Config → Providers → Torznab**

- URL: `http://emulerr:3000/` (or `http://NAS:PORT/api` for caps/search)
- API Key: `PASSWORD` (if set)
- Types: E (ebook), M (magazine), A (audio) as needed
- **Category mapping:**
  - BookCat: `8000,8010,7020`
  - MagCat: `8030,7040`
  - AudioCat: `3030`

**Final folders:** Ebooks go to `/downloads/complete/books`, magazines to `/downloads/complete/magazines`. Configure LazyLibrarian's Remote Path Mappings so these paths are accessible.

### Magazines

1. Go to **Magazines**
2. Enter magazine title (e.g. `Hackable`) in "Magazine Title"
3. Click **+ Magazine**
4. Use **Search** to find issues on the eD2K network

## aMule configuration overrides

You can override (or add) any setting from the base `amule.conf` without editing the original file.
At container startup an override file is merged on top of the base configuration.

Location inside the container:
```
/config/amule/amule.overrides.conf
```

Minimal example matching the shipped default with a changed nick:
```ini
[eMule]
Nick=emulerr_test_override
```

## Troubleshooting

### LazyLibrarian: "can only concatenate str (not bytes) to str" when adding magnet links

This is a known LazyLibrarian bug with magnet links that use 32-character base32 info hashes. The error occurs in `calculate_torrent_hash()` before any request reaches eMulerr.

**Fix:** Run the patch script (requires LazyLibrarian container to be running):

```bash
./scripts/patch-lazylibrarian-torrent-hash.sh lazylibrarian
```

Then restart LazyLibrarian. The patch adds `.decode()` so the hash is a string before concatenation.

## Removing stale downloads
Since eMulerr simulates a qBittorrent api, it is fully compatible with:
- [Decluttarrr](https://github.com/ManiMatter/decluttarr)
- [eMulerrStalledChecker](https://github.com/Jorman/Scripts/tree/master/eMulerrStalledChecker)
