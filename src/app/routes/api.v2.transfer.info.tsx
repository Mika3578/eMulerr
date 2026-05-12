import { LoaderFunction, json } from "@remix-run/node"

export const loader = (() =>
  json({
    dl_info_speed: 0,
    up_info_speed: 0,
    dl_info_data: 0,
    up_info_data: 0,
    dl_rate_limit: 0,
    up_rate_limit: 0,
    dht_nodes: 0,
    connection_status: "connected",
  })) satisfies LoaderFunction

export const action = loader
