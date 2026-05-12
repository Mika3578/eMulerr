import { ActionFunction } from "@remix-run/node"

export const action = (() =>
  new Response("Ok.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  })) satisfies ActionFunction
