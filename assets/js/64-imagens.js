/* ===================== IMAGENS: reduzir antes de guardar =====================
   Tudo que o sistema guarda (fotos coladas, anexos, avatar) vai dentro do mesmo registro
   que é enviado à nuvem a cada salvamento. Uma captura de tela colada chega a 150 KB ou
   mais; reduzida para no máximo 1600 px em JPEG fica em ~10 a 20% disso, sem diferença
   visível na tela. PNG com transparência continua PNG (só é reduzido de tamanho).
   GIF, SVG e qualquer outro formato passam sem mexer. Se algo falhar ou o resultado não
   ficar menor, devolve o original: nunca perde a imagem. */
export const IMG_MAX_LADO = 1600;
export const IMG_QUALIDADE = 0.82;
/* abaixo disso nem tenta: já é leve */
export const IMG_LIMITE_LEVE = 60 * 1024;

const TIPOS_REDUZIVEIS = /^data:image\/(png|jpe?g);base64,/i;

function carregarImagem(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagem inválida'));
    img.src = src;
  });
}

/* true se algum pixel não é totalmente opaco (amostra a imagem já reduzida) */
function temTransparencia(ctx, w, h){
  try{
    const d = ctx.getImageData(0, 0, w, h).data;
    for(let i = 3; i < d.length; i += 4) if(d[i] < 255) return true;
  }catch(e){}
  return false;
}

export async function otimizarImagem(dataUrl, opts){
  const o = Object.assign({ max: IMG_MAX_LADO, qualidade: IMG_QUALIDADE }, opts || {});
  try{
    if(typeof dataUrl !== 'string' || !TIPOS_REDUZIVEIS.test(dataUrl)) return dataUrl;
    if(dataUrl.length <= IMG_LIMITE_LEVE) return dataUrl;
    const img = await carregarImagem(dataUrl);
    const escala = Math.min(1, o.max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const ePng = /^data:image\/png/i.test(dataUrl);
    let saida;
    if(ePng && temTransparencia(ctx, w, h)){
      saida = canvas.toDataURL('image/png');
    }else{
      /* JPEG não tem transparência: pinta o fundo de branco e redesenha */
      const c2 = document.createElement('canvas');
      c2.width = w; c2.height = h;
      const x2 = c2.getContext('2d');
      x2.fillStyle = '#fff'; x2.fillRect(0, 0, w, h);
      x2.drawImage(canvas, 0, 0);
      saida = c2.toDataURL('image/jpeg', o.qualidade);
    }
    return saida && saida.length < dataUrl.length ? saida : dataUrl;
  }catch(e){
    return dataUrl;
  }
}
