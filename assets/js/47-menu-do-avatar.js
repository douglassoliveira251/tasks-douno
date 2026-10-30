import { closeNotebookMenu } from './29-notas-lista.js';
import { disconnectFile } from './44-vinculo-de-arquivo-e-init.js';
import { openSettingsView } from './45-nav-view-switch.js';

/* ===================== MENU DO AVATAR ===================== */
document.getElementById('topbarAvatarBtn').onclick = (e) => {
  e.stopPropagation();
  const menu = document.getElementById('avatarDropdownMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('topbarAvatarWrap');
  const menu = document.getElementById('avatarDropdownMenu');
  if(menu.style.display !== 'none' && wrap && !wrap.contains(e.target)){
    menu.style.display = 'none';
  }
});
document.addEventListener('click', (e) => {
  const pop = document.getElementById('notebookMenuPopover');
  if(pop && !pop.contains(e.target) && !e.target.closest('.notebook-menu-btn')){
    closeNotebookMenu();
  }
});
document.getElementById('avatarMenuProfileBtn').onclick = () => {
  document.getElementById('avatarDropdownMenu').style.display = 'none';
  openSettingsView('perfil');
};
document.getElementById('avatarMenuSettingsBtn').onclick = () => {
  document.getElementById('avatarDropdownMenu').style.display = 'none';
  openSettingsView('personalizacao');
};
document.getElementById('avatarMenuLogoutBtn').onclick = (e) => {
  e.stopPropagation();
  disconnectFile(e);
  document.getElementById('avatarDropdownMenu').style.display = 'none';
};

