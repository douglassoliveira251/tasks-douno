import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Backup adulterado: nada pode executar código nem escapar de atributos. */
test.describe('Sanitização do estado importado', () => {
  test('HTML rico: remove script, handlers e javascript:, mantém formatação; texto limpo não é reescrito', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      const sujo = '<p onclick="window.__x=1">oi <b>negrito</b></p><script>window.__x=2</script><img src="x" onerror="window.__x=3"><a href="javascript:window.__x=4">l</a><iframe src="//e.com"></iframe><a href="https://ok.com" target="_blank">ok</a>';
      const limpo = '<div>linha<br>outra</div><ul><li>a</li></ul>';
      return { sujo: sanitizarHtml(sujo), limpo: sanitizarHtml(limpo) === limpo };
    });
    expect(r.sujo).not.toMatch(/script|onclick|onerror|javascript:|iframe/i);
    expect(r.sujo).toContain('<b>negrito</b>');
    expect(r.sujo).toContain('href="https://ok.com"');
    expect(r.limpo).toBe(true);
  });

  test('normalizeState: cor, hora e anexo inválidos são trocados; válidos ficam iguais', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      state.categories[0].color = '#fff;" onmouseover="window.__x=5';
      state.tags = [{ id: 'tg1', name: 'x', color: '#2F5F9E' }, { id: 'tg2', name: 'y', color: 'var(--primary)' }];
      state.events = [{ id: 'e1', title: 'a', date: '2026-01-01', startTime: '"><img src=x onerror=window.__x=6>', endTime: '10:30' }];
      state.notes = [{ id: 'n1', title: 't', body: '<img src=x onerror="window.__x=7">texto', attachments: [{ id: 'a', dataUrl: 'javascript:window.__x=8' }] }];
      normalizeState();
      return {
        cor: state.categories[0].color, tg1: state.tags[0].color, tg2: state.tags[1].color,
        ini: state.events[0].startTime, fim: state.events[0].endTime,
        body: state.notes[0].body, anexo: state.notes[0].attachments[0].dataUrl,
      };
    });
    expect(r.cor).toBe('#4A6FA5');
    expect(r.tg1).toBe('#2F5F9E');
    expect(r.tg2).toBe('var(--primary)');
    expect(r.ini).toBe('');
    expect(r.fim).toBe('10:30');
    expect(r.body).not.toMatch(/onerror/);
    expect(r.body).toContain('texto');
    expect(r.anexo).toBe('');
  });

  test('nota adulterada aberta para edição não executa nada', async ({ page }) => {
    await gotoApp(page, { view: 'notes' });
    await page.evaluate(() => {
      state.notes = [{ id: 'n1', title: 'Nota', body: '<img src=x onerror="window.__x=9"><script>window.__x=10</script>ok', attachments: [], tagIds: [], createdAt: 1, updatedAt: 1 }];
      normalizeState(); render();
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__x)).toBeUndefined();
  });
});
