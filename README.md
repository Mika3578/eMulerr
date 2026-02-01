# eMulerr

Seamless integration for eD2k/KAD (eMule) networks and Radarr, Sonarr, LazyLibrarian, Readarr, Medusa, enjoy.

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

(Optional) Add eMulerr as a dependency for Radarr, Sonarr, LazyLibrarian, Readarr, Medusa, etc:

```diff
 radarr:
   image: lscr.io/linuxserver/radarr:latest
+  depends_on:
+    emulerr:
+      condition: service_healthy
```

## Configuring Radarr, Sonarr, LazyLibrarian, Readarr, Medusa

Radarr, Sonarr, [LazyLibrarian](https://lazylibrarian.gitlab.io/) (GitLab), Readarr, and Medusa all use qBittorrent Web API v2. Use the same configuration:

In order to get started, configure the Download Client:

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

Then, add a new Indexer (Radarr, Sonarr, Readarr) or Torznab provider (LazyLibrarian, Readarr):

- Type: `Torznab`
- Name: `emulerr`
- RSS: `No`
- Automatic Search: `No`
- Interactive Search: `Yes`
- URL: `http://emulerr:3000/`
- API Key (if using PASSWORD): `PASSWORD` (from environment variable)
- Download Client: `emulerr`

For LazyLibrarian and Readarr (books/audiobooks): enable **E** (Ebook) and optionally **A** (Audiobook) in Types, and tick the provider to use it in searches.

> **Note**: eMulerr only supports eD2k content from its Torznab indexer. Standard BitTorrent magnets from Torznab/RSS providers (Jackett, etc.) will not work—those use the BitTorrent network, while eMulerr uses eD2k/KAD. For BitTorrent content, use a real qBittorrent client.

## LazyLibrarian setup (docker-compose)

The `docker-compose.yml` includes LazyLibrarian as a supported app. Configure eMulerr as both download client and Torznab provider:

1. **Build and start**: `docker compose build emulerr && docker compose up -d`
2. **LazyLibrarian UI**: http://localhost:5299/home
3. **Add eMulerr as downloader**: Config → Downloaders → Use qBitTorrent:
   - Host: `emulerr`
   - Port: `3000`
   - Username: `emulerr`
   - Password: `1234` (matches PASSWORD env)
   - Label: `books` (optional)
4. **Directory** (where LazyLibrarian expects completed downloads): `/data/usenet/complete`
5. Use the **Test** button to verify the connection.
6. **Add eMulerr as Torznab provider** (Config → Providers → Torznab):
   - URL: `http://emulerr:3000/`
   - API Key (if using PASSWORD): `PASSWORD` (from environment variable)
   - Types: Enable **E** (Ebook) and optionally **A** (Audiobook)
   - Tick the provider to use it in searches.

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

## Removing stale downloads
Since eMulerr simulates a qBittorrent api, it is fully compatible with:
- [Decluttarrr](https://github.com/ManiMatter/decluttarr)
- [eMulerrStalledChecker](https://github.com/Jorman/Scripts/tree/master/eMulerrStalledChecker)
