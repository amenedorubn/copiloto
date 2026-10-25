/* ===========================================================================
   acceso · quién puede usar el conector /mcp (v2.74)
   ---------------------------------------------------------------------------
   El mismo esquema que el MCP de Obsidian (amenedorubn/claude-obsidian-mcp):
   OAuth con @cloudflare/workers-oauth-provider y el inicio de sesión de GitHub,
   y solo entra TU cuenta de GitHub (id 284012543, «amenedorubn»).

     claude.ai -> /authorize (esta página: «¿Dejar que Claude use Copiloto?»)
               -> GitHub (inicias sesión) -> /callback -> claude.ai, ya conectado

   Secretos (panel de Cloudflare, nunca en el repo):
     GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET   de una OAuth App de GitHub cuyo
                                              callback es <este Worker>/callback
     GITHUB_USUARIO_ID (opcional)            por defecto 284012543
   =========================================================================== */

const USUARIO_POR_DEFECTO = "284012543";
// claude.ai y claude.com: a donde puede volver la autorizacion (los conectores personalizados)
export function redirectOk(uri) {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" && /^(?:[a-z0-9-]+\.)*claude\.(?:ai|com)$/i.test(u.hostname);
  } catch (e) { return false; }
}
export function registroOk({ clientMetadata }) {
  const r = (clientMetadata && clientMetadata.redirect_uris) || [];
  if (!Array.isArray(r) || !r.length || !r.every(redirectOk))
    return { code: "invalid_redirect_uri", description: "Este conector solo se puede añadir desde claude.ai.", status: 403 };
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function pagina(titulo, cuerpo, headers, estado) {
  const h = new Headers(headers || {});
  h.set("Content-Type", "text/html; charset=utf-8");
  h.set("Cache-Control", "no-store");
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><style>body{font:17px/1.5 system-ui,sans-serif;background:#111418;color:#f4f5f7;margin:0;display:grid;place-items:center;min-height:100vh}
main{max-width:420px;padding:28px 24px}h1{font-size:24px;margin:0 0 12px}p{color:#b7bcc4}b{color:#f4f5f7}
button{width:100%;height:52px;border:0;border-radius:26px;font:700 18px system-ui;margin-top:12px;cursor:pointer}
.si{background:#f08a4b;color:#140b04}.no{background:#262b31;color:#f4f5f7}</style></head><body><main>${cuerpo}</main></body></html>`, { status: estado || 200, headers: h });
}

// GET /authorize: la página de permiso. POST /authorize: «Permitir» -> GitHub
export async function autoriza(req, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET)
    return pagina("Copiloto", "<h1>Falta configurar el conector</h1><p>Faltan los secretos GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET en el panel de Cloudflare (mira CONECTOR.md).</p>", null, 503);
  const P = env.OAUTH_PROVIDER;
  if (req.method === "GET") {
    const ar = await P.parseAuthRequest(req);
    if (!redirectOk(ar.redirectUri)) return pagina("Copiloto", "<h1>No</h1><p>Este conector solo se puede añadir desde claude.ai.</p>", null, 403);
    const d = await P.describeConsent(ar), t = await P.beginConsent(ar);
    return pagina("Conectar Copiloto", `<h1>¿Dejar que Claude use Copiloto?</h1>
<p><b>${esc(d.clientName)}</b> (vuelve a <b>${esc(d.redirectHost || d.redirectUri)}</b>) podrá <b>leer y cambiar tus comidas</b> y ver lo que hay en casa.</p>
<p>Después te pedirá entrar con GitHub: solo vale tu cuenta.</p>
<form method="post" action="/authorize"><input type="hidden" name="handle" value="${esc(t.handle)}">
<button class="si" name="decision" value="si">Permitir</button><button class="no" name="decision" value="no">Cancelar</button></form>`, t.headers);
  }
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const f = await req.formData(), handle = String(f.get("handle") || "");
  if (f.get("decision") !== "si") {
    const n = await P.denyConsent(req, handle);
    return new Response(null, { status: 302, headers: n.headers });
  }
  const ok = await P.approveConsent(req, handle, { scope: ["comidas"] });
  const h = new Headers(ok.headers), up = await P.beginUpstream(ok.request, { headers: h });
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  u.searchParams.set("redirect_uri", new URL("/callback", req.url).href);
  u.searchParams.set("scope", "read:user");
  u.searchParams.set("state", up.state);
  up.headers.forEach((v, k) => { if (k.toLowerCase() === "set-cookie") h.append(k, v); });
  h.set("Location", u.href);
  return new Response(null, { status: 302, headers: h });
}

// GET /callback: vuelve de GitHub. Solo entra tu cuenta.
export async function vueltaGithub(req, env) {
  const P = env.OAUTH_PROVIDER, url = new URL(req.url);
  const r = await P.finishUpstream(req), code = url.searchParams.get("code");
  if (!code) return pagina("Copiloto", "<h1>Cancelado</h1><p>GitHub no ha devuelto el permiso.</p>", r.headers, 400);
  const tk = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "copiloto-api" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: new URL("/callback", req.url).href })
  }).then((x) => x.json()).catch(() => null);
  if (!tk || !tk.access_token) return pagina("Copiloto", "<h1>No se ha podido entrar</h1><p>GitHub no ha dado el acceso. Vuelve a intentarlo desde claude.ai.</p>", r.headers, 502);
  const yo = await fetch("https://api.github.com/user", { headers: { Authorization: "Bearer " + tk.access_token, "User-Agent": "copiloto-api", Accept: "application/vnd.github+json" } })
    .then((x) => x.ok ? x.json() : null).catch(() => null);
  if (!yo || String(yo.id) !== String(env.GITHUB_USUARIO_ID || USUARIO_POR_DEFECTO))
    return pagina("Copiloto", "<h1>Esta cuenta no</h1><p>Solo puede entrar la cuenta de GitHub dueña de Copiloto.</p>", r.headers, 403);
  const { redirectTo } = await P.completeAuthorization({ request: r.request, userId: String(yo.id), metadata: { login: yo.login },
    scope: ["comidas"], props: { login: yo.login } });
  const h = new Headers(r.headers); h.set("Location", redirectTo);
  return new Response(null, { status: 302, headers: h });
}
