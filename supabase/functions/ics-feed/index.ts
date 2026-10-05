import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function icsEscape(text: string): string {
  return String(text || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDateStamp(dateStr: string, timeStr?: string | null): string {
  const datePart = (dateStr || "").replace(/-/g, "");
  if (!timeStr) return datePart;
  const timePart = timeStr.replace(":", "") + "00";
  return `${datePart}T${timePart}`;
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = "";
  let i = 0;
  while (i < line.length) {
    const chunk = i === 0 ? line.slice(0, 75) : line.slice(i, i + 74);
    result += (i === 0 ? "" : "\r\n ") + chunk;
    i += i === 0 ? 75 : 74;
  }
  return result;
}

const FREQ_MAP: Record<string, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

function buildRRule(ev: any): string | null {
  const freq = FREQ_MAP[ev.recurrence];
  if (!freq) return null;
  const parts = [`FREQ=${freq}`];
  const interval = Number(ev.recurrenceInterval) || 1;
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  if (ev.recurrenceEndDate) {
    const isAllDay = !!ev.allDay || !ev.startTime;
    if (isAllDay) {
      parts.push(`UNTIL=${String(ev.recurrenceEndDate).replace(/-/g, "")}`);
    } else {
      parts.push(`UNTIL=${String(ev.recurrenceEndDate).replace(/-/g, "")}T235959Z`);
    }
  }
  return parts.join(";");
}

function buildEventBlock(ev: any, stampDate: string): string[] {
  const isAllDay = !!ev.allDay || !ev.startTime;
  const dtStart = isAllDay ? icsDateStamp(ev.date) : icsDateStamp(ev.date, ev.startTime);
  const endDate = ev.endDate || ev.date;
  const dtEnd = isAllDay ? icsDateStamp(endDate) : icsDateStamp(endDate, ev.endTime || ev.startTime);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${ev.id}@taskin`,
    `DTSTAMP:${icsDateStamp(stampDate, "00:00")}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(ev.title || "Sem título")}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
  const rrule = buildRRule(ev);
  if (rrule) lines.push(`RRULE:${rrule}`);
  lines.push("END:VEVENT");
  return lines;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response("Token ausente.", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("taskin_state")
    .select("data")
    .eq("ics_token", token)
    .maybeSingle();

  if (error || !data) {
    return new Response("Link inválido.", { status: 404 });
  }

  const events = Array.isArray((data as any).data?.events) ? (data as any).data.events : [];
  const stampDate = new Date().toISOString().slice(0, 10);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DOUNO Tasks//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:DOUNO Tasks",
    "X-PUBLISHED-TTL:PT4H",
  ];
  events.forEach((ev: any) => {
    if (!ev || !ev.date) return;
    lines.push(...buildEventBlock(ev, stampDate));
  });
  lines.push("END:VCALENDAR");

  const body = lines.map(foldLine).join("\r\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
