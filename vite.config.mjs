import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Publica version.json ao lado do index.html: é o que o aviso de atualização compara com a versão carregada
// (os arquivos do bundle têm hash no nome, então a versão não pode mais ser lida de um arquivo fixo).
function versionFile() {
  const src = readFileSync(new URL('./assets/js/00-versao.js', import.meta.url), 'utf8');
  const version = src.match(/const APP_VERSION = '(\d+(?:\.\d+)+)'/)[1];
  return {
    name: 'douno-version-json',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) + '\n' });
    },
  };
}

export default defineConfig({
  plugins: [versionFile()],
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
});
