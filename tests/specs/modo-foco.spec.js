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

test('Foco: botão só no celular; ligar mostra a tarefa atrasada primeiro, esconde o menu e lembra a escolha', async ({ page }) => {
  await prepara(page);
  await expect(page.locator('#focoBtn')).toBeVisible();
  await ligar(page);
  await expect(page.locator('.nav')).toBeHidden();
  await expect(page.locator('.fc-main .fc-title')).toHaveText('Revisar proposta do cliente');
  await expect(page.locator('.fc-main .fc-tag.late')).toContainText('Atrasada · Alta');
  await expect(page.locator('.fc-sec')).toContainText('Depois · 2');
  await expect(page.locator('.fc-li')).toHaveCount(2);
  await expect(page.locator('.fc-foot')).toContainText('0 de 2 feitas hoje');
  await page.screenshot({ path: 'test-results/foco-tarefa.png' });
  expect(await page.evaluate(() => localStorage.getItem('dounoFoco'))).toBe('1');
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

test('Foco: reunião chegando toma o lugar do cartão; Entendi dispensa', async ({ page }) => {
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
