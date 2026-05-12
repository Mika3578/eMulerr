import { ActionFunction } from "@remix-run/node"

export const action = (async ({ request }) => {
  const formData = await request.formData()
  const formPassword = formData.get("password")
  const password = typeof formPassword === "string" ? formPassword : undefined

  const hasAuth = process.env.PASSWORD != null && process.env.PASSWORD !== ""
  if (hasAuth && process.env.PASSWORD !== password) {
    return new Response(`Fails.`, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=0",
      },
    })
  }

  const sid = hasAuth ? (password ?? "ok") : "ok"
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : ""
  return new Response(`Ok.`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
      "Set-Cookie": `SID=${sid}; Path=/; HttpOnly; SameSite=Lax${secure}`,
    },
  })
}) satisfies ActionFunction
