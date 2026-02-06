import { ActionFunction } from "@remix-run/node"

// qBittorrent Web API v1 compatibility: POST /login
// LazyLibrarian and other legacy clients use /login (not /api/v2/auth/login)
export const action = (async ({ request }) => {
  const formData = await request.formData()
  const password = formData.get("password") ?? formData.get("pass")

  const hasAuth = process.env.PASSWORD != null && process.env.PASSWORD !== ""
  if (hasAuth && process.env.PASSWORD !== password) {
    return new Response(``, {
      status: 403,
      headers: {
        "Content-Type": "text/plain",
        "X-Content-Type-Options": "nosniff",
      },
    })
  }

  const sid = hasAuth ? (password ?? process.env.PASSWORD) : "ok"
  return new Response(`Ok.`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Set-Cookie": `SID=${sid}; path=/`,
    },
  })
}) satisfies ActionFunction
