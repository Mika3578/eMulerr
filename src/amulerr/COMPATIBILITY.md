# qBittorrent API compatibility (PR #14)

Verified against upstream client source (July 2026).

## Sonarr (`QBittorrentProxyV2.cs`)

| Endpoint | Status |
|---|---|
| `GET /api/v2/app/webapiVersion` | Implemented (`text/plain`, `2.11.0`) |
| `GET /api/v2/app/version` | Implemented (`text/plain`, `v4.6.7`) |
| `GET /api/v2/app/preferences` | Implemented (ratio/seeding limits disabled) |
| `POST /api/v2/auth/login` | Implemented (`Ok.` + `SID` cookie) |
| `GET /api/v2/torrents/info` | Implemented (+ `ratio`, `seeding_time`, `completion_on`, …) |
| `GET /api/v2/torrents/properties` | Implemented — **404 when missing** (fixes `IsTorrentLoaded`) |
| `GET /api/v2/torrents/files` | Implemented |
| `POST /api/v2/torrents/add` | Implemented (ignores extra qBittorrent form fields) |
| `POST /api/v2/torrents/delete` | Implemented (`hashes=all` clears shared) |
| `POST /api/v2/torrents/setCategory` | Implemented |
| `POST /api/v2/torrents/createCategory` | Implemented |
| `GET /api/v2/torrents/categories` | Implemented |
| `POST /api/v2/torrents/setShareLimits` | No-op `Ok` |
| `POST /api/v2/torrents/topPrio` | No-op `Ok` |
| `POST /api/v2/torrents/setForceStart` | No-op `Ok` |
| `GET /api/v2/torrents/categories` | Already covered |
| `POST /api/v2/torrents/createCategory` | Already covered |
| `POST /api/v2/torrents/contents` | Covered (Medusa alias → same as `/torrents/files`) |
| `POST /api/v2/torrents/pause` / `resume` / `start` / `stop` | Implemented |

## Radarr

Same proxy as Sonarr (`QBittorrentProxyV2.cs`); same coverage.

## PyMedusa (`medusa/clients/torrent/qbittorrent.py`)

| Need | Status |
|---|---|
| `webapiVersion` + `auth/login` | Covered |
| `torrents/add` with `urls`, `category`, `savepath` | Covered (`savepath` ignored) |
| `torrents/info` fields: `hash`, `state`, `ratio`, `downloaded`, `size`, `save_path`, `content_path` | Covered |
| `torrents/setCategory`, `torrents/delete` | Covered |
| `torrents/pause` / `resume` / `stop` / `start` | Covered via existing routes |
| `POST /api/v2/torrents/contents` | Covered — alias of `/torrents/files` (PyMedusa seeding/post-process) |
| `GET /api/v2/torrents/categories` | Already covered |
| `POST /api/v2/torrents/createCategory` | Already covered |

## LazyLibrarian GitLab (`lib/qbittorrent.py` + `lazylibrarian/qbittorrent.py`)

| Method | qBittorrent API | Status |
|---|---|---|
| `api_version` | `GET app/webapiVersion` | Covered |
| `qbittorrent_version` | `GET app/version` | Covered |
| `preferences()` | `GET app/preferences` | Covered (`max_ratio_*`, `max_seeding_time_*`) |
| `torrents(category=…)` | `GET torrents/info` | Covered |
| `get_torrent(hash)` | `GET torrents/properties` | Covered — 404 while polling after add |
| `get_torrent_files(hash)` | `GET torrents/files` | Covered |
| `download_from_link` / `download_from_file` | `POST torrents/add` | Covered (extra kwargs ignored) |
| `delete` / `delete_permanently` | `POST torrents/delete` | Covered |
| `pause` | `POST torrents/pause` or `stop` | Covered |

## Hash / magnet rules

- Internal ed2k: 32-hex uppercase.
- API-facing btih: 40-hex lowercase, last 8 chars `00000000`.
- `fromMagnetLink` only accepts amulerr magnets (`tr=http://amulerr`).
- Invalid hashes rejected before aMule RPC.

## Harmless unsupported qBittorrent features (no-op or ignored)

- Per-torrent share limits (`setShareLimits`)
- Queue priority (`topPrio`)
- Force start flag (`setForceStart`)
- `savepath` on add (category path from aMule categories)
- `paused` / `stopped` / `ratioLimit` / `sequentialDownload` on add

## `/torrents/properties` behavior note

Sonarr/Radarr `IsTorrentLoaded()` returns true on any HTTP 200 from `/torrents/properties`, so missing torrents **must** be 404. LazyLibrarian treats 404 as retry/failure in its add poll loop (`get_torrent` → falsy).
