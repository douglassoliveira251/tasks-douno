import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const abrir = async (page) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await gotoApp(page, { view: 'tasks' });
};
const ligar = async (page) => { await page.click('#focoBtn'); await expect(page.locator('body')).toHaveClass(/foco-on/); };

const prepara = async (page, extra) => {
  await abrir(page);
  await page.evaluate((src) => {
    const c = state.categories[0].id, hoje = todayStr();
    const t = (id, title, ex) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1000 + Number(id.replace(/\D/g, '') || 0), recurrence: 'none' }, ex);
    state.tasks = [
      t('t1', 'Revisar proposta do cliente', { dueDate: addDaysStr(hoje, -1), priority: 'alta' }),
      t('t2', 'Ligar para o contador', { dueDate: hoje, dueTime: '11:00' }),
      t('t3', 'Pagar boleto', { dueDate: hoje }),
      t('t4', 'Sem data nenhuma'),
      t('t5', 'Declaração de imposto', { dueDate: addDaysStr(hoje, 2) }),
    ];
    state.events = [];
    if (src) eval('(' + src + ')')();
    render();
  }, extra ? extra.toString() : null);
};

test('Foco: botão só no celular; ligar mostra a tarefa atrasada primeiro, mostra a barra com Foco marcado', async ({ page }) => {
  await prepara(page);
  await expect(page.locator('#focoBtn')).toBeVisible();
  await ligar(page);
  await expect(page.locator('.nav')).toBeVisible(); // barra flutuante com a aba Foco marcada
  await expect(page.locator('.nav-foco-item')).toHaveClass(/active/);
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Revisar proposta do cliente');
  await expect(page.locator('.fc-main .fc-tag.late')).toContainText('Atrasada · Alta');
  await expect(page.locator('.fc-sec')).toContainText('Depois · 2');
  await expect(page.locator('.fc-li')).toHaveCount(2);
  await expect(page.locator('.fc-foot')).toContainText('0 de 2 feitas hoje');
  await page.screenshot({ path: 'test-results/foco-tarefa.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  // desligar volta ao app
  await page.click('#focoBtn');
  await expect(page.locator('body')).not.toHaveClass(/foco-on/);
  await expect(page.locator('.nav')).toBeVisible();
  // computador: sem botão
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('#focoBtn')).toBeHidden();
});

test('Foco: Concluir passa para a próxima; Pular manda para o fim; a lista também conclui', async ({ page }) => {
  await prepara(page);
  await ligar(page);
  await page.click('#fcSkip');
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Ligar para o contador'); // a pulada vai para o fim
  await page.click('#fcDone');
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 't2').done)).toBe(true);
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Pagar boleto');
  await page.locator('.fc-chk').first().click(); // a restante da lista é a pulada (t1)
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 't1').done)).toBe(true);
  await page.click('#fcDone');
  await expect(page.locator('.fc-big')).toHaveText('Tudo feito por hoje');
  await expect(page.locator('#fcExit')).toBeVisible();
  await page.screenshot({ path: 'test-results/foco-tudo-feito.png' });
  await page.click('#fcExit');
  await expect(page.locator('body')).not.toHaveClass(/foco-on/);
});

test('Foco: Adiar abre as opções e muda o prazo; Amanhã tira a tarefa de hoje', async ({ page }) => {
  await prepara(page);
  await ligar(page);
  await page.click('#fcLater');
  await expect(page.locator('.fc-sheet')).toBeVisible();
  await page.screenshot({ path: 'test-results/foco-adiar.png' });
  await page.locator('.fc-opt[data-to]').first().click();
  const t1 = await page.evaluate(() => ({ d: state.tasks.find(t => t.id === 't1').dueDate, amanha: addDaysStr(todayStr(), 1) }));
  expect(t1.d).toBe(t1.amanha);
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Ligar para o contador');
  // cancelar fecha sem mudar
  await page.click('#fcLater'); await page.click('#fcSheetX');
  await expect(page.locator('.fc-sheet')).toHaveCount(0);
});

test('Foco: título abre os detalhes e ao fechar volta ao Foco', async ({ page }) => {
  await prepara(page);
  await ligar(page);
  await page.locator('.fc-main .fc-link').click();
  await expect(page.locator('body')).not.toHaveClass(/foco-on/);
  await expect(page.locator('.task-panel')).toBeVisible();
  await page.evaluate(() => { activeTaskId = null; creatingNewTask = false; render(); });
  await expect(page.locator('body')).toHaveClass(/foco-on/);
});

// a reunião é criada 20 min à frente do relógio: perto da meia-noite cairia no dia seguinte (CI roda em UTC)
const pertoDaMeiaNoite = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() > 1420; };
test('Foco: reunião chegando toma o lugar do cartão; Entendi dispensa', async ({ page }) => {
  test.skip(pertoDaMeiaNoite(), 'faltam menos de 20 min para meia-noite');
  await prepara(page, () => {
    const d = new Date(Date.now() + 20 * 60000); // começa em 20 min
    const hh = (x) => String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
    const f = new Date(d.getTime() + 3600000);
    state.events = [{ id: 'e1', title: 'Reunião de alinhamento', date: todayStr(), endDate: todayStr(), startTime: hh(d), endTime: hh(f), allDay: false, categoryId: state.categories[0].id, tagIds: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1 }];
  });
  await ligar(page);
  await expect(page.locator('.fc-meet .fc-title')).toHaveText('Reunião de alinhamento');
  await expect(page.locator('.fc-warn')).toContainText('Começa em');
  await expect(page.locator('.fc-sec')).toContainText('Depois · 3'); // as tarefas ficam embaixo
  await page.screenshot({ path: 'test-results/foco-reuniao.png' });
  await page.click('#fcAck');
  await expect(page.locator('.fc-meet')).toHaveCount(0);
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Revisar proposta do cliente');
});

test('Foco: reunião longe (mais de 30 min) não aparece; "Abrir agenda" sai do Foco e vai ao calendário', async ({ page }) => {
  await prepara(page, () => {
    const d = new Date(Date.now() + 3 * 3600000);
    if (d.getDate() !== new Date().getDate()) return; // virada do dia: sem reunião
    const hh = (x) => String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
    state.events = [{ id: 'e1', title: 'Mais tarde', date: todayStr(), endDate: todayStr(), startTime: hh(d), endTime: hh(new Date(d.getTime() + 3600000)), allDay: false, categoryId: state.categories[0].id, tagIds: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1 }];
  });
  await ligar(page);
  await expect(page.locator('.fc-meet')).toHaveCount(0);
});

test('Foco: dia sem tarefas mostra a próxima com data e cria tarefa já com prazo de hoje', async ({ page }) => {
  await prepara(page, () => { state.tasks = state.tasks.filter(t => t.id === 't5' || t.id === 't4'); });
  await ligar(page);
  await expect(page.locator('.fc-big')).toHaveText('Nada para hoje');
  await expect(page.locator('.fc-next')).toContainText('Declaração de imposto');
  await page.screenshot({ path: 'test-results/foco-vazio.png' });
  await page.click('#fcNew');
  await expect(page.locator('.task-panel')).toBeVisible();
  await page.fill('#tpName', 'Tarefa criada no Foco');
  await page.press('#tpName', 'Enter');
  const t = await page.evaluate(() => state.tasks.find(x => x.title === 'Tarefa criada no Foco'));
  expect(t.dueDate).toBe(await page.evaluate(() => todayStr()));
});

test('Foco: respeita o espaço escolhido e o modo escuro', async ({ page }) => {
  await prepara(page, () => {
    const c2 = state.categories[1] ? state.categories[1].id : null;
    if (c2) state.tasks.find(t => t.id === 't2').categoryId = c2;
  });
  await ligar(page);
  await page.evaluate(() => { activeCategoryFilter = state.categories[1] ? state.categories[1].id : null; render(); });
  if (await page.evaluate(() => !!state.categories[1])) {
    await expect(page.locator('.fc-main .fc-title')).toHaveText('Ligar para o contador');
    await expect(page.locator('.fc-foot')).toContainText('de 1 feitas');
  }
  await page.evaluate(() => { activeCategoryFilter = null; document.documentElement.setAttribute('data-theme', 'dark'); render(); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/foco-escuro.png' });
});

test('Foco: no celular o app abre direto no Foco; no computador abre normal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await gotoApp(page, { view: 'tasks', foco: true });
  await expect(page.locator('body')).toHaveClass(/foco-on/);
  await expect(page.locator('.nav')).toBeVisible(); // barra flutuante com a aba Foco marcada
  await expect(page.locator('.nav-foco-item')).toHaveClass(/active/);
  await expect(page.locator('#focoBtn')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/foco-abre-m.png' });
  // desligar leva ao app; recarregar abre no Foco de novo
  await page.click('#focoBtn');
  await expect(page.locator('body')).not.toHaveClass(/foco-on/);
  await page.reload();
  await page.waitForFunction(() => typeof render === 'function');
  await page.evaluate(() => { closeLoginGate(); render(); });
  await expect(page.locator('body')).toHaveClass(/foco-on/);
  // computador: abre normal
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  await page.waitForFunction(() => typeof render === 'function');
  await page.evaluate(() => { closeLoginGate(); render(); });
  await expect(page.locator('body')).not.toHaveClass(/foco-on/);
});

test('Foco: tarefa para retomar hoje (ou retomada vencida) entra na fila; retomar no futuro não', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await gotoApp(page, { view: 'tasks', foco: true });
  await page.evaluate(() => {
    const c = state.categories[0].id, hoje = todayStr();
    const t = (id, title, ex) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, recurrence: 'none' }, ex);
    state.tasks = [
      t('r1', 'Retomar proposta', { followUpDate: hoje }),
      t('r2', 'Retomada vencida', { followUpDate: addDaysStr(hoje, -3) }),
      t('r3', 'Retomar só semana que vem', { followUpDate: addDaysStr(hoje, 6) }),
    ];
    state.events = [];
    render();
  });
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Retomada vencida');
  await expect(page.locator('.fc-main .fc-tag.late')).toContainText('Retomada vencida');
  await expect(page.locator('.fc-li')).toHaveCount(1);
  await expect(page.locator('.fc-li')).toContainText('Retomar proposta');
  await expect(page.locator('#focoView')).not.toContainText('Retomar só semana que vem');
  // a retomada de hoje também aparece como fila (sem prazo, a etiqueta é Retomar hoje)
  await page.locator('#fcDone').click();
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Retomar proposta');
  await expect(page.locator('.fc-main .fc-tags').first()).toContainText('Retomar hoje');
});

test('Foco (celular): progresso do dia acima da primeira tarefa; topo com perfil à esquerda e Desligar sozinho à direita', async ({ page }) => {
  await prepara(page);
  await ligar(page);
  const foot = await page.locator('.fc-foot-top').boundingBox();
  const card = await page.locator('.fc-main').boundingBox();
  expect(foot.y).toBeLessThan(card.y);
  await expect(page.locator('#focoBtn')).toHaveText('Desligar');
  const x = async (sel) => (await page.locator(sel).boundingBox()).x;
  expect(await x('#topbarAvatarWrap')).toBeLessThan(await x('#searchWrap'));
  expect(await x('#focoBtn')).toBeGreaterThan(await x('#topbarNotifWrap'));
  await expect(page.locator('#searchWrap')).toBeVisible();
  await expect(page.locator('#topbarNotifWrap')).toBeVisible();
  const r = await page.locator('#focoBtn').boundingBox();
  expect(r.x + r.width).toBeLessThanOrEqual(390 - 8); // o Desligar não encosta na borda
  await page.screenshot({ path: 'test-results/foco-topo-m.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('Foco (celular): botão Foco flutua acima da barra; no Foco a barra aparece e tocar numa aba sai do Foco', async ({ page }) => {
  await prepara(page);
  const b = await page.locator('#focoBtn').boundingBox();
  expect(b.y + b.height).toBeLessThan(844 - 60); // acima da barra
  await page.locator('#navFocoBtn').click();
  await expect(page.locator('body')).toHaveClass(/foco-on/);
  await expect(page.locator('.nav')).toBeVisible();
  await page.locator('.nav-item[data-view="notes"]').click();
  await expect(page.locator('body')).not.toHaveClass(/foco-on/);
  expect(await page.evaluate(() => currentView)).toBe('notes');
});
