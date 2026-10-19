import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id, today = todayStr();
  const t = (id, title, extra) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'alta', dueDate: today, dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: Date.now() - 1000 }, extra);
  state.tasks = [t('a', 'Hoje 1'), t('b', 'Hoje 2', { followUpDate: today }), t('c', 'Atrasada', { dueDate: addDaysStr(today, -2) }), t('d', 'Feita', { done: true, status: 'concluida', completedAt: Date.now() - 3600000 })];
  state.projects = [{ id: 'p1', name: 'Casa', categoryId: cat, stages: [{ id: 's1', name: 'E1', start: addDaysStr(today, -10), end: addDaysStr(today, -1) }], startDate: today, endDate: '', createdAt: 1 }];
  state.events = [{ id: 'e1', title: 'Reunião', date: today, endDate: today, startTime: '15:00', endTime: '16:00', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: 1 }];
  currentView = 'dashboard'; render();
};

test.describe('Resumo', () => {
  test('mostra o destaque de hoje, retomadas, projetos e agenda', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await expect(page.locator('.rs-big')).toContainText('2');
    await expect(page.locator('.rs-hero')).toContainText('para retomar');
    await expect(page.locator('.rs-hero')).toContainText('1 atrasada');
    await expect(page.locator('.rs-hero')).toContainText('projeto em atraso');
    await expect(page.locator('.rs-proj')).toContainText('Casa');
    await expect(page.locator('.rs-card', { hasText: 'Agenda de hoje' })).toContainText('Reunião');
    await expect(page.locator('.rs-card', { hasText: 'Retomar hoje' }).first()).toContainText('Hoje 2');
  });

  test('cartão do espaço abre as tarefas daquele espaço', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await page.locator('.rs-space').first().click();
    expect(await page.evaluate(() => currentView)).toBe('tasks');
    expect(await page.evaluate(() => activeCategoryFilter)).toBe(await page.evaluate(() => state.categories[0].id));
  });

  test('clicar num prazo abre a tarefa e no projeto abre o projeto', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await page.locator('.rs-row[data-task-id="a"]').first().click();
    expect(await page.evaluate(() => [currentView, activeTaskId])).toEqual(['tasks', 'a']);
    await page.evaluate(() => { activeTaskId = null; currentView = 'dashboard'; render(); });
    await page.locator('.rs-proj').click();
    expect(await page.evaluate(() => [currentView, activeProjectId])).toEqual(['projects', 'p1']);
  });

  test('modo escuro usa a paleta azul-petróleo', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { state.theme = 'dark'; document.documentElement.setAttribute('data-theme', 'dark'); });
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    expect(bg).toBe('#0A141D');
  });
});
