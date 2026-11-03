/* Gera assets/js/icones.js a partir do Phosphor Icons (MIT, https://phosphoricons.com).
   Para usar um ícone novo: acrescente o nome (e o peso) em ICONES e rode `npm run icones`.
   O resultado fica versionado, então o app (e os testes, que servem o código-fonte sem build) não precisa do pacote. */
import { readFileSync, writeFileSync } from 'node:fs';

const ICONES = {
  'push-pin': ['regular', 'duotone'],
  'dots-three-vertical': ['regular'],
};

const base = new URL('../node_modules/@phosphor-icons/core/assets/', import.meta.url);
const dados = {};
for (const [nome, pesos] of Object.entries(ICONES)) {
  for (const peso of pesos) {
    const arq = peso === 'regular' ? `${nome}.svg` : `${nome}-${peso}.svg`;
    const svg = readFileSync(new URL(`${peso}/${arq}`, base), 'utf8');
    dados[`${nome}:${peso}`] = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
  }
}

const saida = `/* ARQUIVO GERADO por scripts/gerar-icones.mjs (npm run icones). Não edite à mão.
   Ícones: Phosphor Icons, licença MIT (https://phosphoricons.com). */
const ICONES = ${JSON.stringify(dados, null, 2)};

/* icon('push-pin') ou icon('push-pin', 'duotone'): SVG inline que herda a cor do texto (currentColor). */
export function icon(nome, peso = 'regular'){
  const corpo = ICONES[nome + ':' + peso];
  if(!corpo) throw new Error('Ícone não gerado: ' + nome + ' (' + peso + ')');
  return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' + corpo + '</svg>';
}
`;
writeFileSync(new URL('../assets/js/icones.js', import.meta.url), saida.replace(/\n/g, '\r\n'));
