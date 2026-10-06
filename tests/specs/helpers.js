/** Abre o app e sai da tela de login/vínculo de arquivo, direto pro estado
 * em memória — é o mesmo atalho usado manualmente durante o desenvolvimento
 * (closeLoginGate + render), sem precisar de conta na nuvem nem arquivo local
 * pra rodar os testes.
 *
 * `seenVersion` marca as novidades como já vistas, pra o painel não abrir por
 * cima dos testes; passe null pra testar a primeira abertura. */
export async function gotoApp(page, { view = 'tasks', seenVersion = '999.0.0' } = {}) {
  // roda a cada navegação, então só aplica na primeira (um reload no meio do
  // teste não pode desfazer o "já visto" gravado pelo próprio app)
  await page.addInitScript((v) => {
    try {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      if (v === null) localStorage.removeItem('dounoSeenVersion');
      else localStorage.setItem('dounoSeenVersion', v);
    } catch (e) {}
  }, seenVersion);
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof render === 'function');
  await page.evaluate((view) => {
    closeLoginGate();
    currentView = view;
    document.documentElement.setAttribute('data-theme', 'light');
    render();
  }, view);
}

export async function evalApp(page, fn, arg) {
  return page.evaluate(fn, arg);
}
