import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Secrets cadastrados no painel da funcao (nunca no codigo).
const RESEND_API_KEY = Deno.env.get("RESEND_SECRET_API");
const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");

function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function escapeHtml(text: string): string {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildDigestHtml(today: string, tasksToday: any[], tasksOverdue: any[], eventsToday: any[]): string {
  const fmtDate = new Date(today + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const section = (title: string, items: string[]) =>
    items.length
      ? `<h3 style="margin:20px 0 8px; font-size:14px; color:#151B28;">${title}</h3><ul style="margin:0; padding-left:18px; color:#333;">${items
          .map((i) => `<li style="margin-bottom:4px;">${i}</li>`)
          .join("")}</ul>`
      : "";
  const taskLine = (t: any) =>
    `${escapeHtml(t.title || "Sem título")}${t.dueTime ? ` <span style="color:#888;">(${t.dueTime})</span>` : ""}`;
  const eventLine = (e: any) =>
    `${escapeHtml(e.title || "Sem título")}${!e.allDay && e.startTime ? ` <span style="color:#888;">(${e.startTime})</span>` : ""}`;

  const hasAnything = tasksToday.length || tasksOverdue.length || eventsToday.length;

  return `
  <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif; max-width:520px; margin:0 auto; padding:24px;">
    <div style="font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#10B981; font-weight:700; margin-bottom:6px;">DOUNO Tasks</div>
    <h2 style="margin:0 0 4px; font-size:20px; color:#151B28;">Seu resumo de hoje</h2>
    <p style="margin:0 0 12px; color:#666; text-transform:capitalize;">${fmtDate}</p>
    ${hasAnything ? "" : `<p style="color:#333;">Tudo em dia — nada pendente pra hoje.</p>`}
    ${section("Atrasadas", tasksOverdue.map(taskLine))}
    ${section("Tarefas de hoje", tasksToday.map(taskLine))}
    ${section("Agenda de hoje", eventsToday.map(eventLine))}
    <p style="margin-top:28px; font-size:12px; color:#999;">Enviado automaticamente pelo DOUNO Tasks, todo dia às 7h.</p>
  </div>`;
}

Deno.serve(async (req: Request) => {
  if (!TRIGGER_SECRET || req.headers.get("x-trigger-secret") !== TRIGGER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!RESEND_API_KEY) {
    return new Response("RESEND_SECRET_API não configurada.", { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: rows, error } = await supabase.from("taskin_state").select("data");
  if (error) {
    return new Response(`Erro ao ler dados: ${error.message}`, { status: 500 });
  }

  const today = todaySaoPaulo();
  const results = [];

  for (const row of rows || []) {
    const stateData = (row as any).data || {};
    const email = stateData.profile?.email;
    if (!email) continue;

    const tasks = Array.isArray(stateData.tasks) ? stateData.tasks : [];
    const events = Array.isArray(stateData.events) ? stateData.events : [];

    const tasksToday = tasks.filter((t: any) => !t.done && t.dueDate === today);
    const tasksOverdue = tasks.filter((t: any) => !t.done && t.dueDate && t.dueDate < today);
    const eventsToday = events.filter((e: any) => e.date === today);

    const html = buildDigestHtml(today, tasksToday, tasksOverdue, eventsToday);
    const itemCount = tasksOverdue.length + tasksToday.length + eventsToday.length;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DOUNO Tasks <tasks@douno.com.br>",
        to: [email],
        subject: itemCount ? `Seu resumo diário — ${itemCount} item(ns)` : "Seu resumo diário — tudo em dia",
        html,
      }),
    });
    results.push({ email, status: resp.status, ok: resp.ok });
  }

  return new Response(JSON.stringify({ sent: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
