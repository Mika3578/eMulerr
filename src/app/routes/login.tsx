import { ActionFunction } from "@remix-run/node"

// qBittorrent Web API v1 compatibility: POST /login
// LazyLibrarian and other legacy clients use /login (not /api/v2/auth/login)
export const action = (async ({ request }) => {
  const formData = await request.formData()
  const formPassword = formData.get("password")
  const formPass = formData.get("pass")
  const password =
    typeof formPassword === "string"
      ? formPassword
      : typeof formPass === "string"
        ? formPass
        : undefined

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

  const sid = hasAuth ? (password ?? process.env.PASSWORD ?? "ok") : "ok"
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : ""
  return new Response(`Ok.`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Set-Cookie": `SID=${sid}; Path=/; HttpOnly; SameSite=Lax${secure}`,
    },
  })
}) satisfies ActionFunction
