/* ---- recorte circular ---- */
const cropImgEl = () => document.getElementById('cropImg');
let cropState = { natW:0, natH:0, base:1, zoom:1, offX:0, offY:0, dragging:false, startMouse:{x:0,y:0}, startOff:{x:0,y:0} };
const CROP_SIZE = 220;

function openCropModal(dataUrl){
  const img = cropImgEl();
  img.onload = () => {
    cropState.natW = img.naturalWidth;
    cropState.natH = img.naturalHeight;
    cropState.base = Math.max(CROP_SIZE/cropState.natW, CROP_SIZE/cropState.natH);
    cropState.zoom = 1; cropState.offX = 0; cropState.offY = 0;
    document.getElementById('cropZoom').value = 1;
    updateCropTransform();
  };
  img.src = dataUrl;
  document.getElementById('cropOverlay').classList.add('show');
}

function cropBounds(){
  const total = cropState.base * cropState.zoom;
  const w = cropState.natW * total, h = cropState.natH * total;
  return { maxX: Math.max(0,(w-CROP_SIZE)/2), maxY: Math.max(0,(h-CROP_SIZE)/2), w, h, total };
}

function updateCropTransform(){
  const { maxX, maxY, w, h } = cropBounds();
  cropState.offX = Math.min(maxX, Math.max(-maxX, cropState.offX));
  cropState.offY = Math.min(maxY, Math.max(-maxY, cropState.offY));
  const img = cropImgEl();
  img.style.width = w+'px';
  img.style.height = h+'px';
  img.style.left = (CROP_SIZE/2 - w/2 + cropState.offX)+'px';
  img.style.top = (CROP_SIZE/2 - h/2 + cropState.offY)+'px';
}

const cropStageEl = document.getElementById('cropStage');
cropStageEl.addEventListener('mousedown', e => {
  cropState.dragging = true;
  cropState.startMouse = { x:e.clientX, y:e.clientY };
  cropState.startOff = { x:cropState.offX, y:cropState.offY };
});
window.addEventListener('mousemove', e => {
  if(!cropState.dragging) return;
  cropState.offX = cropState.startOff.x + (e.clientX - cropState.startMouse.x);
  cropState.offY = cropState.startOff.y + (e.clientY - cropState.startMouse.y);
  updateCropTransform();
});
window.addEventListener('mouseup', () => cropState.dragging = false);

document.getElementById('cropZoom').addEventListener('input', e => {
  cropState.zoom = parseFloat(e.target.value);
  updateCropTransform();
});

document.getElementById('cancelCropBtn').onclick = () => document.getElementById('cropOverlay').classList.remove('show');
let cropOverlayMouseDownOnBackdrop = false;
document.getElementById('cropOverlay').addEventListener('mousedown', e => {
  cropOverlayMouseDownOnBackdrop = (e.target.id === 'cropOverlay');
});
document.getElementById('cropOverlay').addEventListener('click', e => {
  if(e.target.id==='cropOverlay' && cropOverlayMouseDownOnBackdrop) e.target.classList.remove('show');
});

document.getElementById('applyCropBtn').onclick = () => {
  const { total } = cropBounds();
  const canvas = document.createElement('canvas');
  canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(CROP_SIZE/2 + cropState.offX, CROP_SIZE/2 + cropState.offY);
  ctx.scale(total, total);
  ctx.drawImage(cropImgEl(), -cropState.natW/2, -cropState.natH/2);
  ctx.restore();
  tempAvatarData = canvas.toDataURL('image/png');
  const preview = document.getElementById('avatarPreview');
  if(preview) preview.innerHTML = avatarInnerHtml({ name: state.profile.name, avatar: tempAvatarData });
  document.getElementById('cropOverlay').classList.remove('show');
};

