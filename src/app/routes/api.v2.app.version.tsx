import { LoaderFunction } from "@remix-run/node"

export const loader = (() =>
  new Response("4.6.0", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction

export const action = loader
