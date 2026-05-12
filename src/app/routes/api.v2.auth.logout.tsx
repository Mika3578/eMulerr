import { ActionFunction } from "@remix-run/node"

export const action = (() =>
  new Response("Ok.", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Set-Cookie": "SID=; Max-Age=0; path=/",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies ActionFunction
