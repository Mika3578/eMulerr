import { ActionFunction } from "@remix-run/node"

/**
 * Legacy qBittorrent Web UI API v1 - Login endpoint.
 * Used by LazyLibrarian and other clients that use the old API.
 * POST /login with username/password form data, returns SID cookie.
 */
export const action = (async ({ request }) => {
  if (request.method !== "POST") {
    return new Response("", { status:405 })
  }

  const formData = await request.formData()
  const password = formData.get("password")?.toString()

  if (process.env.PASSWORD !== "" && process.env.PASSWORD !== password) {
    return new Response("", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
        "X-Content-Type-Options": "nosniff",
      },
    })
  }

  const sid = process.env.PASSWORD !== "" ? process.env.PASSWORD : "emulerr"
  return new Response("Ok.", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
      "X-Content-Type-Options": "nosniff",
      "Set-Cookie": `SID=${sid}; path=/`,
    },
  })
}) satisfies ActionFunction
