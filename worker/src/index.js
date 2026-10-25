/* ===========================================================================
   copiloto-api · la entrada del Worker (v2.74)
   ---------------------------------------------------------------------------
   Todo va detrás del OAuthProvider (@cloudflare/workers-oauth-provider):
     POST /mcp   el conector de la Claude del chat (mcp.js): pide token OAuth
     lo demás    la app de siempre (app.js): /salud, /agenda, /cocina… con su
                 clave X-Copiloto-Key; y el inicio de sesión del conector
                 (/authorize, /callback: acceso.js). /token, /register y
                 /.well-known/… los sirve el OAuthProvider.
   OAUTH_KV es el mismo KV que COPILOTO (sus claves llevan prefijo propio).
   =========================================================================== */
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { app, cambiosCocina } from "./app.js";
import { atiende, bloqueFormato } from "./mcp.js";
import { registroOk } from "./acceso.js";
import RECETAS_MD from "../../docs/RECETAS-CALENDARIO.md";

const DEPS = { formato: bloqueFormato(RECETAS_MD), cambios: cambiosCocina };

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: { fetch: (req, env) => atiende(req, env, DEPS) },
  defaultHandler: app,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  // la URL del conector (RFC 9728): la que se pega en claude.ai
  resourceMetadata: { resource: "https://copiloto-api.amenedorubn.workers.dev/mcp", resource_name: "Copiloto · comidas" },
  scopesSupported: ["comidas"],
  accessTokenTTL: 24 * 3600,
  clientRegistrationCallback: registroOk
});
