import { LoaderFunction, json } from "@remix-run/node"

/**
 * Legacy qBittorrent Web UI API v1 - Get preferences.
 * Returns save_path and temp_path for LazyLibrarian getFolder().
 */
export const loader = (() =>
  json({
    save_path: "/downloads/complete",
    temp_path: "/downloads",
    temp_path_enabled: true,
  })) satisfies LoaderFunction
