/* Gera assets/js/icones.js a partir do Phosphor Icons (MIT, https://phosphoricons.com).
   Para usar um ícone novo: acrescente o nome (e o peso) em ICONES e rode `npm run icones`.
   O resultado fica versionado, então o app (e os testes, que servem o código-fonte sem build) não precisa do pacote. */
import { readFileSync, writeFileSync } from 'node:fs';

const ICONES = {
  'arrow-bend-up-right': ['regular'],
  'arrow-clockwise': ['regular'],
  'arrows-in-simple': ['regular'],
  'arrows-out-simple': ['regular'],
  'bell': ['regular'],
  'book': ['regular'],
  'calendar-blank': ['regular'],
  'caret-down': ['regular'],
  'caret-left': ['regular'],
  'caret-right': ['regular'],
  'caret-up': ['regular'],
  'chat': ['regular'],
  'chat-circle': ['regular'],
  'check': ['regular'],
  'check-square': ['regular'],
  'clock': ['regular'],
  'copy': ['regular'],
  'dots-three-vertical': ['regular'],
  'download-simple': ['regular'],
  'envelope-simple': ['regular'],
  'eraser': ['regular'],
  'eye': ['regular'],
  'eye-slash': ['regular'],
  'file': ['regular'],
  'file-text': ['regular'],
  'flag': ['regular'],
  'floppy-disk': ['regular'],
  'folder': ['regular'],
  'folder-plus': ['regular'],
  'gear': ['regular'],
  'info': ['regular'],
  'kanban': ['regular'],
  'briefcase': ['regular'],
  'graduation-cap': ['regular'],
  'house': ['regular'],
  'arrow-right': ['regular'],
  'magnifying-glass-plus': ['regular'],
  'magnifying-glass-minus': ['regular'],
  'layout': ['regular'],
  'list': ['regular'],
  'list-bullets': ['regular'],
  'list-numbers': ['regular'],
  'magnifying-glass': ['regular'],
  'moon': ['regular'],
  'paperclip': ['regular'],
  'pencil-simple': ['regular'],
  'plus': ['regular'],
  'prohibit': ['regular'],
  'push-pin': ['regular', 'duotone'],
  'question': ['regular'],
  'repeat': ['regular'],
  'sign-out': ['regular'],
  'sliders-horizontal': ['regular'],
  'sparkle': ['regular'],
  'squares-four': ['regular'],
  'stack': ['regular'],
  'star': ['regular', 'fill'],
  'sun': ['regular'],
  'tag': ['regular'],
  'text-align-center': ['regular'],
  'text-align-left': ['regular'],
  'text-align-right': ['regular'],
  'text-indent': ['regular'],
  'thumbs-down': ['regular'],
  'thumbs-up': ['regular'],
  'trash': ['regular'],
  'user': ['regular'],
  'users': ['regular'],
  'warning': ['regular'],
  'warning-circle': ['regular'],
  'x': ['regular'],
  'note': ['regular'],
  'trend-up': ['regular'],
  'export': ['regular'],
  'note-pencil': ['regular'],
  'calendar-plus': ['regular'],
  'copy-simple': ['regular'],
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

/* icon('push-pin') ou icon('push-pin', 'duotone'): SVG inline que herda a cor do texto (currentColor).
   O 3º argumento é um trecho de atributos para o <svg> (ex.: ' class="x" width="14"'). */
export function icon(nome, peso = 'regular', attrs = ''){
  const corpo = ICONES[nome + ':' + peso];
  if(!corpo) throw new Error('Ícone não gerado: ' + nome + ' (' + peso + ')');
  return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"' + attrs + '>' + corpo + '</svg>';
}
`;
writeFileSync(new URL('../assets/js/icones.js', import.meta.url), saida.replace(/\n/g, '\r\n'));
