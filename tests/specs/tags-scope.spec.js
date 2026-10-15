import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('template: tags filtradas pelos espaços escolhidos', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    if(state.categories.length < 2) state.categories.push({ id: 'cat_b', name: 'Pessoal', color: '#9B5DE5' });
    const [a, b] = [state.categories[0].id, state.categories[1].id];
    state.tags = [
      { id: 'ta', name: 'TagA', color: '#2F5F9E', categoryId: a },
      { id: 'tb', name: 'TagB', color: '#9B5DE5', categoryId: b },
      { id: 'tg', name: 'Geral', color: '#10B981', categoryId: '' },
    ];
    state.taskTemplates = [];
    activeCategoryFilter = a;
    openTemplateEditor(null);
  });
  const names = async () => (await page.locator('#tplTags .tpl-tag-chip').allInnerTexts()).sort();
  expect(await names()).toEqual(['Geral', 'TagA']);

  // marca o segundo espaço: TagB entra
  await page.locator('#tplSpaces .tpl-tag-chip').nth(1).click();
  expect(await names()).toEqual(['Geral', 'TagA', 'TagB']);

  // seleciona TagB, depois desmarca o espaço: TagB some e sai da seleção
  await page.locator('#tplTags .tpl-tag-chip', { hasText: 'TagB' }).click();
  await page.locator('#tplSpaces .tpl-tag-chip').nth(1).click();
  expect(await names()).toEqual(['Geral', 'TagA']);
  await page.locator('#tplName').fill('Modelo');
  await page.locator('#tplSave').click();
  expect(await page.evaluate(() => state.taskTemplates[0].tagIds)).toEqual([]);
});

test('agenda: tags existentes saem com um clique e só valem ao salvar', async ({ page }) => {
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    state.tags = [{ id: 't1', name: 'Cliente', color: '#2F5F9E', categoryId: '' }, { id: 't2', name: 'Urgente', color: '#C0392B', categoryId: '' }];
    state.events = [{ id: 'e1', title: 'Reunião', date: today, endDate: today, startTime: '10:00', endTime: '11:00', allDay: false, categoryId: cat, tagIds: ['t1', 't2'], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: 1 }];
    openEventComposer(state.events[0]);
  });
  await expect(page.locator('#evTagsSelected .tp-tag-chip')).toHaveCount(2);
  await page.locator('#evTagsSelected .tp-tag-chip', { hasText: 'Cliente' }).click();
  await expect(page.locator('#evTagsSelected .tp-tag-chip')).toHaveCount(1);
  // ainda não salvou: a agenda real não mudou
  expect(await page.evaluate(() => state.events[0].tagIds)).toEqual(['t1', 't2']);

  await page.locator('#evSaveBtn').click();
  expect(await page.evaluate(() => state.events[0].tagIds)).toEqual(['t2']);
  // a cor da agenda segue a primeira tag
  expect(await page.evaluate(() => eventColor(state.events[0]))).toBe('#C0392B');
});

test('agenda: fechar sem salvar descarta a mudança de tags', async ({ page }) => {
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    state.tags = [{ id: 't1', name: 'Cliente', color: '#2F5F9E', categoryId: '' }];
    state.events = [{ id: 'e1', title: 'Reunião', date: today, endDate: today, startTime: '10:00', endTime: '11:00', allDay: false, categoryId: cat, tagIds: ['t1'], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: 1 }];
    openEventComposer(state.events[0]);
  });
  await page.locator('#evTagsSelected .tp-tag-chip').click();
  await page.evaluate(() => closeEventComposer());
  expect(await page.evaluate(() => state.events[0].tagIds)).toEqual(['t1']);
});
