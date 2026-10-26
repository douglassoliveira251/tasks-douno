import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Secrets cadastrados no painel da funcao (nunca no codigo).
const RESEND_API_KEY = Deno.env.get("RESEND_SECRET_API");
const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");

const APP_URL = "https://tasks.douno.com.br";
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

const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS_FULL = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/* ===== Resumo diário (layout "O dia em números") =====
   Regras do e-mail: só HTML em tabelas, sem imagens (nada para bloquear), fundo branco
   explícito em todas as células (bgcolor + background-color) e cores sólidas, para ler
   igual com o cliente de e-mail em modo claro ou escuro. */

const PRIORITY_STRIP: Record<string, string> = {
  critica: "#E11D48",
  alta: "#F79009",
  media: "#94A3B8",
  baixa: "#CBD5E1",
};
const WARN = "#F59E0B";
const LATE = "#D64545";
const WHITE = "#ffffff";

type Digest = {
  name: string;
  overdue: any[];
  dueToday: any[];
  followOnly: any[];
  followAny: Set<string>;
  todayEvents: any[];
  upcoming: { date: string; events: any[] }[];
  projects: { name: string; color: string; pct: number; late: number; next: string | null }[];
  ctx: (t: any) => string;
};

function diffDays(dateStr: string, today: string): number {
  return Math.round((new Date(dateStr + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
}

function buildDigest(stateData: any, today: string): Digest {
  const categories: any[] = Array.isArray(stateData.categories) ? stateData.categories : [];
  const allTasks: any[] = Array.isArray(stateData.tasks) ? stateData.tasks : [];
  const events: any[] = Array.isArray(stateData.events) ? stateData.events : [];
  const projects: any[] = Array.isArray(stateData.projects) ? stateData.projects : [];
  const open = allTasks.filter((t) => !t.done);
  const byTime = (a: any, b: any) => (a.startTime || a.dueTime || "00:00").localeCompare(b.startTime || b.dueTime || "00:00");

  const overdue = open.filter((t) => t.dueDate && t.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const dueToday = open.filter((t) => t.dueDate === today).sort(byTime);
  const shown = new Set([...overdue, ...dueToday].map((t) => t.id));
  const followAll = open.filter((t) => t.followUpDate && t.followUpDate <= today);
  const followAny = new Set(followAll.map((t) => t.id as string));
  const followOnly = followAll.filter((t) => !shown.has(t.id)).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

  const todayEvents = events.filter((e) => eventOccursOn(e, today)).sort(byTime);
  const upcoming: { date: string; events: any[] }[] = [];
  for (let i = 1; i < DAYS_AHEAD; i++) {
    const d = addDays(today, i);
    const evs = events.filter((e) => eventOccursOn(e, d)).sort(byTime);
    if (evs.length) upcoming.push({ date: d, events: evs });
  }

  const projColor = (p: any) => p.color || categories.find((c) => c.id === p.categoryId)?.color || C.primary;
  const projSummary = projects.map((p) => {
    const tks = allTasks.filter((t) => t.projectId === p.id);
    const openT = tks.filter((t) => !t.done);
    if (!openT.length) return null;
    const prog = tks.reduce((a, t) => a + (t.done ? 1 : (t.subtasks?.length ? t.subtasks.filter((s: any) => s.done).length / t.subtasks.length : 0)), 0);
    const dues = openT.map((t) => t.dueDate).filter(Boolean).sort();
    const nextDue = dues.find((d: string) => d >= today) || null;
    return {
      name: p.name || "Projeto",
      color: projColor(p),
      pct: Math.round((prog / tks.length) * 100),
      late: openT.filter((t) => t.dueDate && t.dueDate < today).length,
      next: nextDue,
    };
  }).filter(Boolean) as Digest["projects"];

  const ctx = (t: any) => {
    const p = t.projectId ? projects.find((x) => x.id === t.projectId) : null;
    if (!p) return "";
    const st = t.stageId ? (p.stages || []).find((s: any) => s.id === t.stageId) : null;
    return `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${escapeHtml(projColor(p))};"></span>&nbsp;${escapeHtml(p.name || "Projeto")}${st ? " › " + escapeHtml(st.name || "") : ""}`;
  };

  const name = String(stateData.profile?.name || "").trim().split(/\s+/)[0] || "";
  return { name, overdue, dueToday, followOnly, followAny, todayEvents, upcoming, projects: projSummary, ctx };
}

function selo(t: any, today: string): string {
  if (!t.dueDate) return "";
  const d = diffDays(t.dueDate, today);
  let label = "", bg = "";
  if (d < 0) { label = `+${-d}d atrasada`; bg = LATE; }
  else if (d === 0) { label = "vence hoje"; bg = WARN; }
  else if (d <= 3) { label = `em ${d}d`; bg = WARN; }
  else return "";
  return `<span style="display:inline-block; background:${bg}; color:#ffffff; font-size:11px; font-weight:800; line-height:14px; padding:3px 10px; border-radius:99px; white-space:nowrap;">${label}</span>`;
}

function tag(text: string, bg: string, color: string): string {
  return `<span style="display:inline-block; background:${bg}; color:${color}; font-size:11px; font-weight:700; line-height:14px; padding:3px 9px; border-radius:7px; white-space:nowrap;">${text}</span>`;
}

function sectionLabel(text: string): string {
  return `<tr><td bgcolor="${WHITE}" style="background-color:${WHITE}; padding:22px 0 6px; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:${C.faint};">${text}</td></tr>`;
}

/* uma linha: faixa de prioridade + (hora) + título/projeto + selos à direita */
function itemRow(opts: { strip: string; lead?: string; title: string; sub?: string; right: string }): string {
  return `<tr><td bgcolor="${WHITE}" style="background-color:${WHITE}; border-bottom:1px solid #EEF1F5;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td width="4" bgcolor="${opts.strip}" style="background-color:${opts.strip}; border-radius:3px; font-size:0; line-height:0;">&nbsp;</td>
      ${opts.lead ? `<td width="56" valign="middle" bgcolor="${WHITE}" style="background-color:${WHITE}; padding:11px 0 11px 12px; font-size:12px; font-weight:700; color:${C.primary}; white-space:nowrap;">${opts.lead}</td>` : `<td width="12" bgcolor="${WHITE}" style="background-color:${WHITE};">&nbsp;</td>`}
      <td valign="middle" bgcolor="${WHITE}" style="background-color:${WHITE}; padding:10px 8px 10px 4px; font-size:14px; line-height:19px; font-weight:600; color:${C.ink};">${opts.title}${opts.sub ? `<div style="font-size:12px; font-weight:400; line-height:17px; color:${C.faint};">${opts.sub}</div>` : ""}</td>
      <td valign="middle" align="right" bgcolor="${WHITE}" style="background-color:${WHITE}; padding:10px 0 10px 8px; white-space:nowrap;">${opts.right}</td>
    </tr></table>
  </td></tr>`;
}

function kpiCell(n: number, label: string, color: string): string {
  return `<td width="25%" bgcolor="${WHITE}" style="background-color:${WHITE}; border:1px solid ${C.border}; border-radius:12px; padding:12px 14px;">
    <div style="font-size:26px; line-height:30px; font-weight:700; color:${color};">${n}</div>
    <div style="font-size:11px; color:${C.soft};">${label}</div></td>`;
}

function buildDigestHtml(today: string, g: Digest): string {
  const d = new Date(today + "T00:00:00Z");
  const weekday = WEEKDAYS_FULL[d.getUTCDay()];
  const dateLabel = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${d.getUTCDate()} de ${MONTHS_FULL[d.getUTCMonth()]}`;
  const empty = !g.overdue.length && !g.dueToday.length && !g.followOnly.length && !g.todayEvents.length && !g.upcoming.length;
  const retomarTag = (t: any) => (g.followAny.has(t.id) ? tag("Retomar", "#FFF1D6", "#8A5A00") : "");
  const prio = (t: any) => PRIORITY_STRIP[t.priority] || PRIORITY_STRIP.media;

  // "Hoje, em ordem": prazos de hoje e compromissos, por horário
  const dayItems = [
    ...g.dueToday.map((t) => ({ time: t.dueTime || "", sort: t.dueTime || "99:98", html: itemRow({ strip: prio(t), lead: escapeHtml(t.dueTime || "Dia"), title: escapeHtml(t.title || "Sem título"), sub: g.ctx(t), right: selo(t, today) + (g.followAny.has(t.id) ? " " + retomarTag(t) : "") }) })),
    ...g.todayEvents.map((e) => ({ time: e.startTime || "", sort: e.allDay || !e.startTime ? "99:99" : e.startTime, html: itemRow({ strip: "#2F9E6B", lead: escapeHtml(e.allDay || !e.startTime ? "Dia" : e.startTime), title: escapeHtml(e.title || "Sem título"), right: tag("Agenda", "#E5F3EC", "#1F6B47") }) })),
  ].sort((a, b) => a.sort.localeCompare(b.sort)).map((x) => x.html).join("");

  const overdueRows = g.overdue.map((t) => itemRow({ strip: prio(t), title: escapeHtml(t.title || "Sem título"), sub: g.ctx(t), right: selo(t, today) + (g.followAny.has(t.id) ? " " + retomarTag(t) : "") })).join("");
  const followRows = g.followOnly.map((t) => itemRow({ strip: prio(t), title: escapeHtml(t.title || "Sem título"), sub: g.ctx(t), right: selo(t, today) || `<span style="font-size:12px; color:${C.faint};">${t.dueDate ? "Prazo " + fmtShort(t.dueDate) : "Sem prazo"}</span>` })).join("");

  const upcomingRows = g.upcoming.map((day) => day.events.map((e, i) => {
    const label = i === 0 ? dayLabel(day.date, today) : "";
    const time = e.allDay || !e.startTime ? "Dia todo" : e.startTime;
    return `<tr><td bgcolor="${WHITE}" style="background-color:${WHITE}; padding:7px 0; border-bottom:1px solid #EEF1F5; font-size:13px; color:${C.ink};"><span style="display:inline-block; width:96px; font-weight:700; color:${C.soft}; text-transform:capitalize;">${escapeHtml(label)}</span><span style="display:inline-block; width:62px; color:${C.primaryDark};">${escapeHtml(time)}</span>${escapeHtml(e.title || "Sem título")}</td></tr>`;
  }).join("")).join("");

  const projectRows = g.projects.map((p) => `<tr><td bgcolor="${WHITE}" style="background-color:${WHITE}; padding:9px 0; border-bottom:1px solid #EEF1F5;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td bgcolor="${WHITE}" style="background-color:${WHITE}; font-size:14px; font-weight:600; color:${C.ink};"><span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${escapeHtml(p.color)};"></span>&nbsp;${escapeHtml(p.name)}</td>
      <td align="right" bgcolor="${WHITE}" style="background-color:${WHITE}; font-size:12px; color:${C.soft};">${p.pct}%${p.late ? ` · <span style="color:${LATE}; font-weight:700;">${p.late} atrasada${p.late > 1 ? "s" : ""}</span>` : ""}${p.next ? ` · próxima entrega ${fmtShort(p.next)}` : ""}</td>
    </tr><tr><td colspan="2" bgcolor="${WHITE}" style="background-color:${WHITE}; padding-top:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td width="${Math.max(p.pct, 1)}%" height="6" bgcolor="${escapeHtml(p.color)}" style="background-color:${escapeHtml(p.color)}; border-radius:3px; font-size:0; line-height:0;">&nbsp;</td>
        <td height="6" bgcolor="#EEF1F5" style="background-color:#EEF1F5; border-radius:3px; font-size:0; line-height:0;">&nbsp;</td>
      </tr></table></td></tr></table></td></tr>`).join("");

  const greeting = g.name ? `Bom dia, ${escapeHtml(g.name)}` : "Bom dia";
  const sections = empty
    ? `<tr><td bgcolor="${WHITE}" style="background-color:${WHITE}; padding:26px 0; font-size:14px; color:${C.soft};">Nada pendente por aqui. Aproveite o dia.</td></tr>`
    : [
      dayItems ? sectionLabel("Hoje, em ordem") + dayItems : "",
      overdueRows ? sectionLabel("Atenção, atrasadas") + overdueRows : "",
      followRows ? sectionLabel("Retomar hoje") + followRows : "",
      upcomingRows ? sectionLabel("Próximos dias") + upcomingRows : "",
      projectRows ? sectionLabel("Projetos") + projectRows : "",
    ].join("");

  return `<!doctype html>
<html lang="pt-BR" style="color-scheme:light only; supported-color-schemes:light;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<style>
  :root{color-scheme:light only; supported-color-schemes:light;}
  @media only screen and (max-width:600px){ .pad{padding-left:8px !important; padding-right:8px !important;} .kpi td{display:block !important; width:100% !important;} }
</style></head>
<body bgcolor="${WHITE}" style="margin:0; padding:0; background-color:${WHITE};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${WHITE}" style="background-color:${WHITE};"><tr><td align="center" class="pad" bgcolor="${WHITE}" style="background-color:${WHITE}; padding:24px 16px;">
  <table width="600" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${WHITE}" style="width:100%; max-width:600px; background-color:${WHITE}; border:1px solid ${C.border}; border-radius:18px; font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
    <tr><td bgcolor="${WHITE}" style="background-color:${WHITE}; padding:22px 26px 6px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td bgcolor="${WHITE}" style="background-color:${WHITE}; font-size:13px; font-weight:800; letter-spacing:.06em; color:${C.primary};">DOUNO <span style="font-weight:600;">Tasks</span></td>
        <td align="right" bgcolor="${WHITE}" style="background-color:${WHITE}; font-size:12px; color:${C.faint};">${dateLabel}</td>
      </tr></table>
      <div style="font-size:24px; line-height:30px; font-weight:700; color:${C.ink}; margin:14px 0 2px;">${greeting}</div>
      <div style="font-size:13px; color:${C.soft};">Seu dia em números</div>
      <table width="100%" cellpadding="0" cellspacing="8" role="presentation" class="kpi" style="margin:10px -8px 0;"><tr>
        ${kpiCell(g.overdue.length, "Atrasadas", g.overdue.length ? LATE : C.ink)}
        ${kpiCell(g.dueToday.length, "Prazo hoje", g.dueToday.length ? "#D98200" : C.ink)}
        ${kpiCell(g.followOnly.length + g.overdue.filter((t) => g.followAny.has(t.id)).length + g.dueToday.filter((t) => g.followAny.has(t.id)).length, "Retomar", C.ink)}
        ${kpiCell(g.todayEvents.length, "Agenda", g.todayEvents.length ? "#1F6B47" : C.ink)}
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${WHITE}" style="background-color:${WHITE}; padding:0 26px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${sections}</table>
    </td></tr>
    <tr><td align="center" bgcolor="${WHITE}" style="background-color:${WHITE}; padding:14px 0 6px;">
      <a href="${APP_URL}" style="display:inline-block; background-color:${C.primary}; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:13px 30px; border-radius:14px;">Abrir o DOUNO Tasks</a>
    </td></tr>
    <tr><td align="center" bgcolor="${WHITE}" style="background-color:${WHITE}; font-size:12px; color:${C.faint}; padding:6px 0 20px;">Enviado automaticamente pelo DOUNO Tasks, todo dia às 7h.</td></tr>
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

    const g = buildDigest(stateData, today);
    const html = buildDigestHtml(today, g);
    const parts = [];
    if (g.overdue.length) parts.push(`${g.overdue.length} atrasada(s)`);
    if (g.dueToday.length) parts.push(`${g.dueToday.length} com prazo hoje`);
    if (g.followOnly.length) parts.push(`${g.followOnly.length} para retomar`);
    if (g.todayEvents.length) parts.push(`${g.todayEvents.length} compromisso(s)`);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DOUNO Tasks <tasks@douno.com.br>",
        to: [email],
        subject: parts.length ? `Seu resumo diário — ${parts.join(", ")}` : "Seu resumo diário — tudo em dia",
        html,
      }),
    });
    results.push({ email, status: resp.status, ok: resp.ok });
  }

  return new Response(JSON.stringify({ sent: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
