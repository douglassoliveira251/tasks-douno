const { getUserFromToken, requireBearer, getValidAccessToken } = require('../_lib/outlook');

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function eventToGraphPayload(ev) {
  const tz = 'America/Sao_Paulo';
  const payload = {
    subject: ev.title || 'Sem título',
    body: { contentType: 'text', content: ev.description || '' },
    categories: Array.isArray(ev.categoryNames) && ev.categoryNames.length
      ? ev.categoryNames.map(String).slice(0, 20)
      : (ev.categoryName ? [ev.categoryName] : []),
  };
  if (ev.allDay || !ev.startTime) {
    payload.isAllDay = true;
    payload.start = { dateTime: `${ev.date}T00:00:00`, timeZone: tz };
    payload.end = { dateTime: `${addDaysStr(ev.endDate || ev.date, 1)}T00:00:00`, timeZone: tz };
  } else {
    payload.isAllDay = false;
    payload.start = { dateTime: `${ev.date}T${ev.startTime}:00`, timeZone: tz };
    payload.end = { dateTime: `${ev.endDate || ev.date}T${ev.endTime || ev.startTime}:00`, timeZone: tz };
  }
  // convite: só quando o usuário ligou "Enviar convite" e informou convidados
  const emails = Array.isArray(ev.attendees) ? ev.attendees.filter(isEmail) : [];
  if (ev.sendInvite && emails.length) {
    payload.attendees = emails.map((address) => ({ emailAddress: { address }, type: 'required' }));
  }
  const recurrence = recurrenceToGraph(ev);
  // PATCH com recurrence:null remove a repetição de um evento que deixou de ser recorrente
  payload.recurrence = recurrence;
  return payload;
}

// na criação, recurrence:null não é necessário
function forCreate(payload) {
  if (payload.recurrence) return payload;
  const { recurrence, ...rest } = payload;
  return rest;
}

function isEmail(x) {
  return typeof x === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function recurrenceToGraph(ev) {
  const unit = ev.recurrence;
  if (!unit || unit === 'none' || !ev.date) return null;
  const interval = Math.max(1, parseInt(ev.recurrenceInterval, 10) || 1);
  const [y, m, d] = ev.date.split('-').map(Number);
  let pattern;
  if (unit === 'daily') pattern = { type: 'daily', interval };
  else if (unit === 'weekly') {
    pattern = { type: 'weekly', interval, daysOfWeek: [DAYS_OF_WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]] };
  } else if (unit === 'monthly') pattern = { type: 'absoluteMonthly', interval, dayOfMonth: d };
  else if (unit === 'yearly') pattern = { type: 'absoluteYearly', interval, dayOfMonth: d, month: m };
  else return null;
  const range = ev.recurrenceEndDate
    ? { type: 'endDate', startDate: ev.date, endDate: ev.recurrenceEndDate }
    : { type: 'noEnd', startDate: ev.date };
  return { pattern, range };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = requireBearer(req);
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Não autenticado.' });

  const { action, event, outlookEventId } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action é obrigatório.' });

  let accessToken;
  try {
    accessToken = await getValidAccessToken(user.id);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao obter token do Outlook.' });
  }
  if (!accessToken) return res.status(409).json({ error: 'Outlook não conectado.' });

  try {
    if (action === 'delete') {
      if (!outlookEventId) return res.status(200).json({ ok: true });
      await fetch(`https://graph.microsoft.com/v1.0/me/events/${outlookEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.status(200).json({ ok: true });
    }

    if (!event) return res.status(400).json({ error: 'event é obrigatório.' });
    const payload = eventToGraphPayload(event);

    if (outlookEventId) {
      const resp = await fetch(`https://graph.microsoft.com/v1.0/me/events/${outlookEventId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.status === 404) {
        const createResp = await fetch('https://graph.microsoft.com/v1.0/me/events', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(forCreate(payload)),
        });
        const data = await createResp.json();
        if (!createResp.ok) return res.status(502).json({ error: 'Erro ao criar evento no Outlook.', details: data });
        return res.status(200).json({ outlookEventId: data.id });
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        return res.status(502).json({ error: 'Erro ao atualizar evento no Outlook.', details: data });
      }
      return res.status(200).json({ outlookEventId });
    }

    const resp = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(forCreate(payload)),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(502).json({ error: 'Erro ao criar evento no Outlook.', details: data });
    return res.status(200).json({ outlookEventId: data.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro inesperado ao sincronizar com o Outlook.' });
  }
};

module.exports.eventToGraphPayload = eventToGraphPayload;
