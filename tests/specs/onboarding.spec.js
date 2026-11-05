import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Primeiro uso', () => {
  test('conta nova: assistente cria espaços, template e a primeira tarefa; Resumo mostra o checklist', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', onboarding: true });
    await expect(page.locator('#onboardingOverlay')).toHaveClass(/show/);
    await expect(page.locator('.onb-title')).toHaveText('Para que você vai usar?');

    await page.locator('[data-uso="trabalho"]').click();
    await page.locator('[data-uso="pessoal"]').click();
    await page.locator('#onbNext').click();

    await expect(page.locator('.onb-title')).toHaveText('Quer começar com modelos prontos?');
    await page.locator('[data-modelo="trabalho:reuniao"]').click();
    await page.locator('#onbNext').click();

    await page.locator('#onbTitulo').fill('Enviar a proposta');
    await page.locator('#onbFinish').click();

    await expect(page.locator('#onboardingOverlay')).not.toHaveClass(/show/);
    const r = await page.evaluate(() => ({
      cats: state.categories.map(c => c.name),
      tpl: state.taskTemplates.map(t => [t.name, t.recurrence, t.subtasks.length, t.categoryIds.length]),
      tasks: state.tasks.map(t => [t.title, t.dueDate === todayStr()]),
      onb: state.onboarding,
    }));
    expect(r.cats).toEqual(['Trabalho', 'Casa e vida pessoal']);
    expect(r.tpl).toEqual([['Reunião semanal', 'weekly', 3, 1]]);
    expect(r.tasks).toEqual([['Enviar a proposta', true]]);
    expect(r.onb).toMatchObject({ done: true, dismissed: false });

    await expect(page.locator('#onbCard')).toBeVisible();
    await expect(page.locator('#onbCard')).toContainText('3 de 5 passos concluídos');
  });

  test('pular o assistente não cria nada e deixa o checklist para depois', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', onboarding: true });
    await page.locator('#onbSkip').click();
    await expect(page.locator('#onboardingOverlay')).not.toHaveClass(/show/);
    expect(await page.evaluate(() => [state.tasks.length, state.categories.length])).toEqual([0, 1]);
    await expect(page.locator('#onbCard')).toContainText('1 de 5 passos concluídos');
  });

  test('o passo "fixar" se marca ao fixar uma tarefa e "Dispensar" esconde o cartão', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', onboarding: true });
    await page.locator('#onbSkip').click();
    await page.evaluate(() => {
      const t = { id: 'x', title: 'Tarefa', done: false, status: 'nao_iniciado', priority: 'media', dueDate: todayStr(), dueTime: '09:00', categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 };
      state.tasks = [t]; togglePinned(t); render();
    });
    await expect(page.locator('#onbCard')).toContainText('3 de 5 passos concluídos');
    await page.locator('#onbDismiss').click();
    await expect(page.locator('#onbCard')).toHaveCount(0);
    expect(await page.evaluate(() => state.onboarding.dismissed)).toBe(true);
  });

  test('conta que já tem dados não vê o assistente nem o cartão', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        if (sessionStorage.getItem('__seeded2')) return;
        sessionStorage.setItem('__seeded2', '1');
        const st = { profile: { name: '', email: '', avatar: null }, categories: [{ id: 'cat_geral', name: 'Geral', color: '#2F6F5E' }], tags: [],
          tasks: [{ id: 't1', title: 'Já existia', done: false, status: 'nao_iniciado', priority: 'media', categoryId: 'cat_geral', tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }],
          notes: [], events: [], uiGroupCollapse: {}, taskIdCounter: 1, theme: 'light' };
        localStorage.setItem('tyvraTasksState', JSON.stringify(st));
      } catch (e) {}
    });
    await gotoApp(page, { view: 'dashboard', onboarding: true });
    await expect(page.locator('#onboardingOverlay')).not.toHaveClass(/show/);
    await expect(page.locator('#onbCard')).toHaveCount(0);
    expect(await page.evaluate(() => state.tasks.length)).toBe(1);
  });
});
