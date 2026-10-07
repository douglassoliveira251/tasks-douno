import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Secrets cadastrados no painel da funcao (nunca no codigo).
const RESEND_API_KEY = Deno.env.get("RESEND_SECRET_API");
const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");

const APP_URL = "https://tasks.douno.com.br";
const LOGO_URL = `${APP_URL}/assets/douno-tasks-logo.png`;
const DAYS_AHEAD = 7; // hoje + próximos 6 dias

// Paleta do app (azul DOUNO Tasks)
const C = {
  primary: "#2F5F9E",
  primaryDark: "#234573",
  primaryLight: "#E4ECF6",
  ink: "#151B28",
  soft: "#5B6270",
  faint: "#8A90A0",
  border: "#E1E5EC",
  bg: "#F3F5F8",
  danger: "#C0392B",
  dangerLight: "#FBE9E7",
};
const PRIORITY_COLOR: Record<string, string> = {
  critica: "#DC2626",
  alta: "#F59E0B",
  media: "#10B981",
  baixa: "#3B82F6",
};

function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function escapeHtml(text: string): string {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function dayLabel(dateStr: string, today: string): string {
  if (dateStr === today) return "Hoje";
  if (dateStr === addDays(today, 1)) return "Amanhã";
  const wd = WEEKDAYS[new Date(dateStr + "T00:00:00Z").getUTCDay()];
  return `${wd}, ${fmtShort(dateStr)}`;
}

// Mesma regra do app: agenda recorrente é salva uma vez; as ocorrências são calculadas.
function eventOccursOn(ev: any, dateStr: string): boolean {
  if (!ev.date) return false;
  if (ev.date === dateStr) return true;
  const rec = ev.recurrence;
  if (!rec || rec === "none" || dateStr < ev.date) return false;
  if (ev.recurrenceEndDate && dateStr > ev.recurrenceEndDate) return false;
  const n = Math.max(1, parseInt(ev.recurrenceInterval, 10) || 1);
  const [ay, am, ad] = ev.date.split("-").map(Number);
  const [dy, dm, dd] = dateStr.split("-").map(Number);
  const daysBetween = Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ay, am - 1, ad)) / 86400000);
  const lastDayOf = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  switch (rec) {
    case "daily": return daysBetween % n === 0;
    case "weekly": return daysBetween % (7 * n) === 0;
    case "monthly": return ((dy - ay) * 12 + (dm - am)) % n === 0 && dd === Math.min(ad, lastDayOf(dy, dm));
    case "yearly": return (dy - ay) % n === 0 && dm === am && dd === Math.min(ad, lastDayOf(dy, dm));
    default: return false;
  }
}

type SpaceBlock = {
  id: string;
  name: string;
  color: string;
  overdue: any[];
  today: any[];
  agenda: { date: string; events: any[] }[];
};

function buildSpaceBlocks(stateData: any, today: string): SpaceBlock[] {
  const categories: any[] = Array.isArray(stateData.categories) ? stateData.categories : [];
  const tasks: any[] = Array.isArray(stateData.tasks) ? stateData.tasks : [];
  const events: any[] = Array.isArray(stateData.events) ? stateData.events : [];

  const known = new Set(categories.map((c) => c.id));
  const spaces = categories.map((c) => ({ id: c.id, name: c.name || "Sem nome", color: c.color || C.primary }));
  const hasOrphans = [...tasks, ...events].some((x) => !known.has(x.categoryId));
  if (hasOrphans) spaces.push({ id: "__none__", name: "Sem espaço", color: C.faint });
  const spaceOf = (x: any) => (known.has(x.categoryId) ? x.categoryId : "__none__");

  const byTime = (a: any, b: any) => (a.startTime || a.dueTime || "00:00").localeCompare(b.startTime || b.dueTime || "00:00");

  return spaces.map((sp) => {
    const myTasks = tasks.filter((t) => spaceOf(t) === sp.id && !t.done && t.dueDate);
    const myEvents = events.filter((e) => spaceOf(e) === sp.id);
    const agenda: { date: string; events: any[] }[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = addDays(today, i);
      const evs = myEvents.filter((e) => eventOccursOn(e, d)).sort(byTime);
      if (evs.length) agenda.push({ date: d, events: evs });
    }
    return {
      ...sp,
      overdue: myTasks.filter((t) => t.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      today: myTasks.filter((t) => t.dueDate === today).sort(byTime),
      agenda,
    };
  }).filter((b) => b.overdue.length || b.today.length || b.agenda.length);
}

function taskRow(t: any, overdue: boolean): string {
  const dot = PRIORITY_COLOR[t.priority] || C.faint;
  const meta = overdue
    ? `<span style="color:${C.danger}; font-weight:600;">Atrasada · ${fmtShort(t.dueDate)}</span>`
    : t.dueTime ? `<span style="color:${C.faint};">${escapeHtml(t.dueTime)}</span>` : "";
  return `<tr>
    <td width="14" valign="top" style="padding:7px 0 0;"><span style="display:block; width:8px; height:8px; border-radius:50%; background:${dot};"></span></td>
    <td style="padding:3px 0 6px; font-size:14px; line-height:1.4; color:${C.ink};">${escapeHtml(t.title || "Sem título")}${meta ? `<br><span style="font-size:12px;">${meta}</span>` : ""}</td>
  </tr>`;
}

function agendaDay(day: { date: string; events: any[] }, today: string): string {
  const isToday = day.date === today;
  const rows = day.events.map((e) => {
    const time = e.allDay || !e.startTime ? "Dia todo" : e.startTime;
    return `<tr>
      <td width="62" valign="top" style="padding:3px 0 5px; font-size:12px; line-height:20px; color:${C.primaryDark}; font-family:Menlo,Consolas,monospace;">${escapeHtml(time)}</td>
      <td style="padding:3px 0 5px; font-size:14px; line-height:20px; color:${C.ink};">${escapeHtml(e.title || "Sem título")}</td>
    </tr>`;
  }).join("");
  return `<div style="margin:0 0 4px; padding-top:6px; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:${isToday ? C.primary : C.faint};">${escapeHtml(dayLabel(day.date, today))}</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>`;
}

function spaceCard(b: SpaceBlock, today: string): string {
  const taskCount = b.overdue.length + b.today.length;
  const left = taskCount
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${b.overdue.map((t) => taskRow(t, true)).join("")}${b.today.map((t) => taskRow(t, false)).join("")}</table>`
    : `<p style="margin:0; font-size:13px; color:${C.faint};">Nenhuma tarefa para hoje.</p>`;
  const right = b.agenda.length
    ? b.agenda.map((d) => agendaDay(d, today)).join("")
    : `<p style="margin:0; font-size:13px; color:${C.faint};">Nada na agenda nos próximos 7 dias.</p>`;

  const colHead = (label: string, count: number) =>
    `<div style="font-size:12px; font-weight:700; color:${C.soft}; margin-bottom:8px;">${label}${count ? ` <span style="display:inline-block; min-width:18px; padding:0 6px; border-radius:9px; background:${C.primaryLight}; color:${C.primaryDark}; text-align:center; font-weight:700;">${count}</span>` : ""}</div>`;
  const agendaCount = b.agenda.reduce((n, d) => n + d.events.length, 0);

  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border:1px solid ${C.border}; border-radius:14px; margin:0 0 14px;">
    <tr><td style="padding:14px 18px 4px; font-size:12px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:${C.ink};">
      <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${escapeHtml(b.color)}; margin-right:7px;"></span>${escapeHtml(b.name)}
    </td></tr>
    <tr><td style="padding:8px 18px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td class="col" width="50%" valign="top" style="padding-right:12px;">${colHead("Tarefas", taskCount)}${left}</td>
        <td class="col col-agenda" width="50%" valign="top" style="padding-left:12px; border-left:1px solid ${C.border};">${colHead("Próximos 7 dias", agendaCount)}${right}</td>
      </tr></table>
    </td></tr>
  </table>`;
}

function buildDigestHtml(today: string, blocks: SpaceBlock[]): string {
  const fmtDate = new Date(today + "T00:00:00Z").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
  const empty = blocks.length === 0;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @media only screen and (max-width:600px){
    .col{display:block !important; width:100% !important; padding:0 !important; border-left:none !important;}
    .col-agenda{padding-top:14px !important; margin-top:14px !important; border-top:1px solid ${C.border} !important;}
    .pad{padding-left:12px !important; padding-right:12px !important;}
  }
</style></head>
<body style="margin:0; padding:0; background:${C.bg};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.bg};"><tr><td align="center" class="pad" style="padding:24px 16px;">
  <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="width:100%; max-width:640px; font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
    <tr><td style="background:${C.primary}; background-image:linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%); border-radius:16px; padding:20px 22px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td width="48" valign="middle"><img src="${LOGO_URL}" width="44" height="44" alt="DOUNO Tasks" style="display:block; border:0; border-radius:12px;"></td>
        <td valign="middle" style="padding-left:12px;">
          <div style="font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#C9D8EE; font-weight:700;">DOUNO Tasks</div>
          <div style="font-size:20px; font-weight:700; color:#ffffff; line-height:1.25;">Seu resumo de hoje</div>
        </td>
        <td valign="middle" align="right" style="font-size:13px; color:#DCE7F6;">${escapeHtml(fmtDate.charAt(0).toUpperCase() + fmtDate.slice(1))}</td>
      </tr></table>
    </td></tr>
    <tr><td style="height:16px; line-height:16px; font-size:0;">&nbsp;</td></tr>
    <tr><td>
      ${empty
        ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border:1px solid ${C.border}; border-radius:14px;"><tr><td style="padding:22px; font-size:15px; color:${C.ink};">Tudo em dia. Nada pendente para hoje nem agendado nos próximos 7 dias.</td></tr></table>`
        : blocks.map((b) => spaceCard(b, today)).join("")}
    </td></tr>
    <tr><td align="center" style="padding:6px 0 14px;">
      <a href="${APP_URL}" style="display:inline-block; background:${C.primary}; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:11px 24px; border-radius:10px;">Abrir o DOUNO Tasks</a>
    </td></tr>
    <tr><td align="center" style="font-size:12px; color:${C.faint}; padding-bottom:8px;">Enviado automaticamente pelo DOUNO Tasks, todo dia às 7h.</td></tr>
  </table>
</td></tr></table>
</body></html>`;
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

    const blocks = buildSpaceBlocks(stateData, today);
    const html = buildDigestHtml(today, blocks);
    const taskCount = blocks.reduce((n, b) => n + b.overdue.length + b.today.length, 0);
    const eventCount = blocks.reduce((n, b) => n + b.agenda.reduce((m, d) => m + d.events.length, 0), 0);
    const parts = [];
    if (taskCount) parts.push(`${taskCount} tarefa(s)`);
    if (eventCount) parts.push(`${eventCount} compromisso(s)`);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DOUNO Tasks <tasks@douno.com.br>",
        to: [email],
        subject: parts.length ? `Seu resumo diário — ${parts.join(" e ")}` : "Seu resumo diário — tudo em dia",
        html,
      }),
    });
    results.push({ email, status: resp.status, ok: resp.ok });
  }

  return new Response(JSON.stringify({ sent: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
