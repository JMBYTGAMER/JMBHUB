/* JMB HUB Command Center — local client-side navigation search. */
const cssUrl = new URL('../../css/command-center.css', import.meta.url).href;
if (!document.querySelector('[data-jmb-command-css]')) {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = cssUrl;
  css.dataset.jmbCommandCss = '';
  document.head.append(css);
}

const inPages = location.pathname.includes('/pages/');
const route = file => (inPages ? '' : 'pages/') + file;
const homeRoute = inPages ? '../index.html' : 'index.html';
let deferredInstallPrompt = null;

const commands = [
  {label:'Dashboard', icon:'⌂', file:'dashboard.html', description:'Your JMB HUB overview', keywords:'home workspace account'},
  {label:'JMB Games', icon:'🎮', file:'games.html', description:'Open the game library and leaderboards', keywords:'play arcade leaderboard scores'},
  {label:'Geometry Dash', icon:'🟪', file:'geometry-dash.html', description:'Play the original auto-run platformer', keywords:'jump rhythm runner platform'},
  {label:'JMB Space Crew', icon:'🚀', file:'among-us.html', description:'Social deduction, tasks and meetings', keywords:'among us crew impostor'},
  {label:'Arcade Plus', icon:'🕹️', file:'arcade-plus.html', description:'Quick Reaction, Memory Matrix, Tile Sprint and Lane Dodge', keywords:'mini games reflex memory'},
  {label:'JMB Area', icon:'🧰', file:'jmb-area.html', description:'Calculators, QR tools and everyday utilities', keywords:'tools calculator qr scanner generator'},
  {label:'Developer Toolbox', icon:'🧑‍💻', file:'dev-toolbox.html', description:'JSON, Base64, URL encoding, UUID and timestamps', keywords:'developer code json encode decode uuid unix'},
  {label:'Security Lab', icon:'🔐', file:'security-lab.html', description:'Browser-local encryption, hashing and key tools', keywords:'security aes sha hash hmac rsa password'},
  {label:'Minecraft Area', icon:'⛏️', file:'minecraft.html', description:'Minecraft command and utility tools', keywords:'mc minecraft commands kit enchant'},
  {label:'JMB AI', icon:'🤖', file:'ai.html', description:'Open the JMB AI workspace', keywords:'artificial intelligence chat'},
  {label:'Support', icon:'🎫', file:'support.html', description:'Create or follow up on a support ticket', keywords:'help ticket report contact'},
  {label:'JMB Coins', icon:'🪙', file:'coins.html', description:'View your virtual coin wallet and store', keywords:'wallet balance rewards transactions'},
  {label:'Ad Network', icon:'📢', file:'ads.html', description:'Manage sponsored campaign requests', keywords:'advertise ads campaign placement'},
  {label:'Profile', icon:'◉', file:'profile.html', description:'View your account and profile options', keywords:'account avatar user settings'},
  {label:'JMB HUB Home', icon:'🏠', href:homeRoute, description:'Return to the public home page', keywords:'landing homepage'},
];
const dialog = document.createElement('dialog');
dialog.className = 'jmb-command-dialog';
dialog.setAttribute('aria-labelledby', 'jmbCommandTitle');
dialog.innerHTML = `
  <div class="jmb-command-shell">
    <div class="jmb-command-head">
      <div><div class="jmb-command-eyebrow">JMB HUB • QUICK LAUNCH</div><h2 id="jmbCommandTitle">Where do you want to go?</h2></div>
      <button class="jmb-command-close" type="button" aria-label="Close search">×</button>
    </div>
    <label class="jmb-command-search-wrap"><span aria-hidden="true">⌕</span><input id="jmbCommandSearch" type="search" placeholder="Search games, tools, pages…" autocomplete="off" spellcheck="false" aria-label="Search JMB HUB commands"></label>
    <div class="jmb-command-results" id="jmbCommandResults" role="listbox" aria-label="Search results"></div>
    <div class="jmb-command-foot"><span>↑ ↓ to navigate · Enter to open · Esc to close</span><kbd>Ctrl K</kbd></div>
    <p class="jmb-command-privacy">Search stays in this browser. Nothing is sent to the server.</p>
  </div>`;
document.body.append(dialog);

const searchInput = dialog.querySelector('#jmbCommandSearch');
const results = dialog.querySelector('#jmbCommandResults');
let activeIndex = 0;
let visibleCommands = [];

function canShowAdmin() {
  const links = [...document.querySelectorAll('[data-admin-only]')];
  return links.some(el => !el.classList.contains('hide') && getComputedStyle(el).display !== 'none');
}
function allCommands() {
  const list = commands.filter(x => x.file !== 'admin.html');
  if (canShowAdmin()) list.push({label:'Admin Console', icon:'⚙️', file:'admin.html', description:'Owner/admin account management', keywords:'owner admin users audit settings'});
  if (deferredInstallPrompt) list.push({label:'Install JMB HUB', icon:'📲', action:installApp, description:'Install JMB HUB on this device', keywords:'app pwa install home screen'});
  return list;
}
function installApp() {
  const promptEvent = deferredInstallPrompt;
  if (!promptEvent) return;
  deferredInstallPrompt = null;
  promptEvent.prompt();
  promptEvent.userChoice?.catch?.(() => {});
  renderResults();
}
function navigate(item) {
  close();
  if (item.action) item.action();
  else if (item.href) location.href = item.href;
  else if (item.file) location.href = route(item.file);
}
function renderResults() {
  const query = searchInput.value.trim().toLowerCase();
  visibleCommands = allCommands().filter(item => {
    const text = [item.label, item.description, item.keywords].join(' ').toLowerCase();
    return !query || text.includes(query);
  });
  activeIndex = Math.min(activeIndex, Math.max(0, visibleCommands.length - 1));
  results.replaceChildren();
  if (!visibleCommands.length) {
    const empty = document.createElement('div');
    empty.className = 'jmb-command-empty';
    empty.textContent = 'No matching pages or tools. Try a shorter search.';
    results.append(empty);
    return;
  }
  visibleCommands.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jmb-command-item' + (index === activeIndex ? ' is-active' : '');
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === activeIndex));
    const icon = document.createElement('span');
    icon.className = 'jmb-command-icon';
    icon.textContent = item.icon;
    const copy = document.createElement('span');
    copy.className = 'jmb-command-copy';
    const title = document.createElement('strong');
    title.textContent = item.label;
    const description = document.createElement('small');
    description.textContent = item.description;
    copy.append(title, description);
    const hint = document.createElement('span');
    hint.className = 'jmb-command-enter';
    hint.textContent = '↵';
    button.append(icon, copy, hint);
    button.addEventListener('mouseenter', () => { activeIndex = index; syncActive(); });
    button.addEventListener('click', () => navigate(item));
    results.append(button);
  });
}
function syncActive() {
  [...results.querySelectorAll('.jmb-command-item')].forEach((el, index) => {
    el.classList.toggle('is-active', index === activeIndex);
    el.setAttribute('aria-selected', String(index === activeIndex));
  });
}
function open() {
  searchInput.value = '';
  activeIndex = 0;
  renderResults();
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else dialog.setAttribute('open', '');
  requestAnimationFrame(() => searchInput.focus());
}
function close() {
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
}
function makeTrigger() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-ghost jmb-command-trigger';
  button.innerHTML = '<span aria-hidden="true">⌕</span><span>Search JMB HUB</span><kbd>Ctrl K</kbd>';
  button.setAttribute('aria-label', 'Search JMB HUB commands');
  button.title = 'Search JMB HUB (Ctrl+K)';
  button.addEventListener('click', open);
  return button;
}

dialog.querySelector('.jmb-command-close').addEventListener('click', close);
dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
searchInput.addEventListener('input', () => { activeIndex = 0; renderResults(); });
searchInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex = Math.min(activeIndex + 1, visibleCommands.length - 1); syncActive(); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); syncActive(); }
  else if (event.key === 'Enter') { event.preventDefault(); if (visibleCommands[activeIndex]) navigate(visibleCommands[activeIndex]); }
});

document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (dialog.open) close(); else open();
  }
});

const sidebar = document.querySelector('.sidebar');
if (sidebar) {
  const brand = sidebar.querySelector('.side-brand');
  if (brand) brand.after(makeTrigger());
}
const mobileActions = document.querySelector('.mobile-head .portal-top-actions');
if (mobileActions) mobileActions.append(makeTrigger());
const topnav = document.querySelector('.topnav');
if (topnav) topnav.append(makeTrigger());
if (!sidebar && !mobileActions && !topnav) {
  const trigger = makeTrigger();
  trigger.classList.add('jmb-command-floating');
  document.body.append(trigger);
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (dialog.open) renderResults();
});
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; });
