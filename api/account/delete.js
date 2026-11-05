/* Exclusão definitiva da conta: apaga os dados da pessoa e o login.
   Segurança: exige o token da sessão E a senha atual (conferida aqui, no servidor),
   e o e-mail digitado precisa ser o da conta. A chave de serviço fica só no ambiente da Vercel. */
const { SUPABASE_URL, SUPABASE_ANON_KEY, getUserFromToken, requireBearer, deleteTokens } = require('../_lib/outlook');

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function senhaConfere(email, password) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return resp.ok;
}

async function apagarEstado(userId) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/taskin_state?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: serviceHeaders(),
  });
  if (!resp.ok) throw new Error(`Erro ao apagar taskin_state: ${resp.status}`);
}

async function apagarUsuario(userId) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: serviceHeaders(),
  });
  if (!resp.ok) throw new Error(`Erro ao apagar usuário: ${resp.status}`);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUserFromToken(requireBearer(req));
  if (!user) return res.status(401).json({ error: 'Não autenticado.' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || email !== String(user.email || '').toLowerCase()) {
    return res.status(400).json({ error: 'O e-mail digitado não confere com o da conta.' });
  }
  if (!password) return res.status(400).json({ error: 'Digite a sua senha.' });

  try {
    if (!(await senhaConfere(user.email, password))) {
      return res.status(403).json({ error: 'Senha incorreta.' });
    }
    await deleteTokens(user.id);
    await apagarEstado(user.id);
    await apagarUsuario(user.id);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Não foi possível excluir a conta agora. Tente novamente.' });
  }
};

function safeJson(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
