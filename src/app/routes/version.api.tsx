import { LoaderFunction } from "@remix-run/node"

// qBittorrent Web API v1 compatibility: GET /version/api
// Returns Web API version as a plain-text integer.
// LazyLibrarian calls int(response.text), so this must be a whole number.
// Version 8 tells LL to use the "label" parameter (< 10), which eMulerr handles.
// *arr apps (Sonarr/Radarr/Readarr) auto-detect v2 via /api/v2/app/webapiVersion
// and never fall through to this v1 endpoint.
export const loader = (() =>
  new Response(`8`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction
