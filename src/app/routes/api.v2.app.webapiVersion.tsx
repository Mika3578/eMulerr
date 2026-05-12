import { LoaderFunction } from "@remix-run/node"

export const loader = (() =>
  new Response(`2.8.0`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction
