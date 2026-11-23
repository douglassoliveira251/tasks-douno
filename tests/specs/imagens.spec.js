import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Fotos coladas, anexos e avatar são reduzidos antes de ir para o estado (e daí para a nuvem). */
test.describe('Imagens: redução antes de guardar', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    // gera imagens de teste no navegador: ruído (pesa muito em PNG) e PNG com transparência
    await page.evaluate(() => {
      window.__img = (w, h, { ruido = true, transparente = false } = {}) => {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d');
        if (!transparente) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
        if (ruido) {
          const d = x.getImageData(0, 0, w, h);
          for (let i = 0; i < d.data.length; i += 4) { d.data[i] = Math.random() * 256; d.data[i + 1] = Math.random() * 256; d.data[i + 2] = Math.random() * 256; d.data[i + 3] = transparente && (i / 4) % 2 ? 128 : 255; }
          x.putImageData(d, 0, 0);
        } else {
          x.fillStyle = 'rgba(255,0,0,0.5)'; x.fillRect(0, 0, w / 2, h);
        }
        return c.toDataURL('image/png');
      };
    });
  });

  test('captura grande: vira JPEG e fica bem menor', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const src = __img(2400, 1200);
      const out = await otimizarImagem(src);
      const im = new Image(); im.src = out; await im.decode();
      return { antes: src.length, depois: out.length, tipo: out.slice(0, 22), w: im.naturalWidth, h: im.naturalHeight };
    });
    expect(r.tipo).toContain('data:image/jpeg');
    expect(r.depois).toBeLessThan(r.antes / 2);
    expect(Math.max(r.w, r.h)).toBeLessThanOrEqual(1600);
    expect(r.w / r.h).toBeCloseTo(2, 1); // proporção mantida
  });

  test('imagem pequena e formatos que não são PNG/JPEG passam sem mexer', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const leve = __img(20, 20, { ruido: false });
      const gif = 'data:image/gif;base64,' + 'R0lGODlh'.repeat(20000);
      const svg = 'data:image/svg+xml;base64,' + 'PHN2Zz48L3N2Zz4='.repeat(10000);
      return [await otimizarImagem(leve) === leve, await otimizarImagem(gif) === gif, await otimizarImagem(svg) === svg, await otimizarImagem('nao e imagem') === 'nao e imagem', await otimizarImagem(null) === null];
    });
    expect(r).toEqual([true, true, true, true, true]);
  });

  test('PNG com transparência continua PNG', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const src = __img(1800, 1800, { ruido: true, transparente: true });
      const out = await otimizarImagem(src, { max: 600 });
      const im = new Image(); im.src = out; await im.decode();
      return { tipo: out.slice(0, 20), menor: out.length < src.length, lado: Math.max(im.naturalWidth, im.naturalHeight) };
    });
    expect(r.tipo).toContain('data:image/png'); // JPEG perderia a transparência
    expect(r.menor).toBe(true);
    expect(r.lado).toBe(600);
  });

  test('imagem corrompida devolve o original', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const ruim = 'data:image/png;base64,' + 'AAAA'.repeat(30000);
      return (await otimizarImagem(ruim)) === ruim;
    });
    expect(r).toBe(true);
  });

  test('colar imagem num editor insere a versão reduzida', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const ed = document.createElement('div'); ed.contentEditable = 'true'; ed.id = 'edTeste'; ed.style.cssText = 'position:fixed;top:0;left:0;width:300px;height:100px;background:#fff;z-index:99999';
      document.body.appendChild(ed); attachFormattedPaste(ed); ed.focus();
      const src = __img(2400, 1200);
      const blob = await (await fetch(src)).blob();
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'cap.png', { type: 'image/png' }));
      ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      for (let i = 0; i < 40 && !ed.querySelector('img'); i++) await new Promise(r => setTimeout(r, 100));
      const img = ed.querySelector('img');
      return img ? { tipo: img.src.slice(0, 22), antes: src.length, depois: img.src.length } : null;
    });
    expect(r).not.toBeNull();
    expect(r.tipo).toContain('data:image/jpeg');
    expect(r.depois).toBeLessThan(r.antes / 2);
  });
});
