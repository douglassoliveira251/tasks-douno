import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id;
  const today = todayStr();
  state.tasks = [{ id: 't1', title: 'Tarefa', done: false, status: 'nao_iniciado', priority: 'media', dueDate: today, dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }];
  const ev = (id, title, date, extra = {}) => ({ id, title, date, endDate: date, startTime: '10:00', endTime: '11:00', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: 't1', description: '', createdAt: 1, ...extra });
  state.events = [
    ev('e1', 'Passada', addDaysStr(today, -3)),
    ev('e2', 'Futura', addDaysStr(today, 4)),
    ev('e3', 'Repete sempre', addDaysStr(today, -30), { recurrence: 'weekly' }),
  ];
  activeTaskId = 't1'; creatingNewTask = false; currentView = 'tasks'; render();
};

test('agendas passadas ficam ocultas e podem ser mostradas', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed);
  const rows = page.locator('#tpAgendaList .tp-task-agenda-row');
  await expect(rows).toHaveCount(2); // Futura + a que repete
  await expect(page.locator('#tpAgendaList')).not.toContainText('Passada');
  await page.locator('#tpPastAgendasBtn').click();
  await expect(rows).toHaveCount(3);
  await expect(page.locator('#tpAgendaList')).toContainText('Passada');
});

test('espaço: nome clicável na linha das tags, sem ícone de pasta', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed);
  await expect(page.locator('#tpMoveGroupBtn')).toHaveCount(0);
  const chip = await page.locator('#tpGroupChip').boundingBox();
  const tag = await page.locator('#tpTagsToggleBtn').boundingBox();
  expect(Math.abs((chip.y + chip.height / 2) - (tag.y + tag.height / 2))).toBeLessThan(8); // mesma linha
  await page.locator('#tpGroupChip').click();
  await expect(page.locator('#moveGroupPortal')).toBeVisible();
});
