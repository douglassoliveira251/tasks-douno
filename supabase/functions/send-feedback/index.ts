import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Secrets cadastrados no painel da função (nunca no código).
const RESEND_API_KEY = Deno.env.get("RESEND_SECRET_API");
const FEEDBACK_TO = Deno.env.get("FEEDBACK_TO") || "douglas.soliveira@outlook.com.br";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function esc(t: string): string {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!RESEND_API_KEY) return json({ error: "Envio de e-mail não configurado." }, 500);

  // Só usuários logados: o JWT da sessão é validado aqui.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado." }, 401);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Sessão inválida." }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }

  const kind = payload.kind === "bad" ? "bad" : "good";
  const message = String(payload.message || "").trim().slice(0, 2000);
  if (!message) return json({ error: "Escreva um comentário." }, 400);
  const version = String(payload.version || "").slice(0, 20);
  const view = String(payload.view || "").slice(0, 40);
  const ua = String(payload.userAgent || "").slice(0, 200);

  const label = kind === "good" ? "👍 Algo bom" : "👎 Algo ruim";
  const color = kind === "good" ? "#10B981" : "#C0392B";
  const html = `
  <div style="font-family:-apple-system,'Segoe UI',Arial,sans-serif; max-width:560px; margin:0 auto; padding:24px; color:#151B28;">
    <div style="font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#2F5F9E; font-weight:700;">DOUNO Tasks · Comentário</div>
    <h2 style="margin:6px 0 14px; font-size:20px;"><span style="color:${color};">${label}</span></h2>
    <div style="background:#F3F6FA; border:1px solid #E1E5EC; border-radius:12px; padding:16px; font-size:15px; line-height:1.55; white-space:pre-wrap;">${esc(message)}</div>
    <p style="margin:16px 0 0; font-size:12.5px; color:#5B6270; line-height:1.6;">
      De: ${esc(user.email || "")}<br>
      Versão: ${esc(version)} · Tela: ${esc(view)}<br>
      Navegador: ${esc(ua)}
    </p>
  </div>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "DOUNO Tasks <tasks@douno.com.br>",
      to: [FEEDBACK_TO],
      reply_to: user.email || undefined,
      subject: `${kind === "good" ? "👍" : "👎"} Comentário no DOUNO Tasks`,
      html,
    }),
  });
  if (!resp.ok) return json({ error: "Não foi possível enviar agora." }, 502);
  return json({ ok: true });
});
