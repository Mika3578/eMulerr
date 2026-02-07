import { ActionFunction } from "@remix-run/node"

// Security note: The SID cookie contains the password for qBittorrent API compatibility.
// This is acceptable as eMulerr is typically deployed in trusted local networks behind
// firewalls. For production deployments, use HTTPS and network isolation.
export const action = (async ({ request }) => {
  const formData = await request.formData()
  const password = formData.get("password")

  const hasAuth = process.env.PASSWORD != null && process.env.PASSWORD !== ""
  if (hasAuth && process.env.PASSWORD !== password) {
    return new Response(``, {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=0",
      },
    })
  }

  const sid = hasAuth ? (password ?? process.env.PASSWORD) : "ok"
  return new Response(`Ok.`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
      "Set-Cookie": `SID=${sid}; path=/`,
    },
  })
}) satisfies ActionFunction
