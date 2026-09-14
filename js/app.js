import {APP_CONFIG} from './config/app-config.js';
import {guard,logout} from './core/auth-guard.js';
import {db,backendReady} from './core/firebase.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {$,esc} from './core/ui.js';
const defaults=APP_CONFIG.SERVICES;
const cards=[['games','🎮','JMB Games','Play mini-games, chase high scores and climb the leaderboard.','games.html'],['area','🧰','JMB Area','Calculator, QR tools, code tester, file utilities and more.','jmb-area.html'],['minecraft','⛏️','Minecraft Area','Build legal item, enchantment and PvP kit commands.','minecraft.html'],['ai','🤖','JMB AI','Open your JMB AI service.','ai.html'],['support','🎫','Support','Create and track support tickets.','support.html'],['chat','◌','Global Chat','Chat live with the JMB HUB community.','chat.html'],['admin','⚙','Admin Panel','Private administration tools for authorized staff.','admin.html']];
async function loadServices(){
  let services={...defaults};
  const local=JSON.parse(localStorage.getItem('jmb-service-settings')||'{}');
  Object.keys(local).forEach(k=>services[k]={...services[k],...local[k]});
  if(backendReady&&db){try{const snap=await getDoc(doc(db,'settings','portal'));if(snap.exists()&&snap.data().services){services={...services,...snap.data().services}}}catch{}}
  return services;
}
async function boot(){
  const u=await guard();
  const services=await loadServices();
  const isStaff=u.owner||u.admin;
  if(!isStaff){const i=cards.findIndex(x=>x[0]==='admin');if(i>=0)cards.splice(i,1)}
  const grid=$('#serviceGrid');
  grid.innerHTML=cards.map(([key,icon,title,desc,url])=>{const s=services[key]||{enabled:true};return `<article class="card service-card ${s.enabled===false?'service-off':''}"><span class="icon">${icon}</span><h3>${esc(title)}</h3><p>${esc(s.enabled===false?s.message:desc)}</p><a class="btn ${s.enabled===false?'btn-ghost':'btn-primary'} open" href="${s.enabled===false?'#':url}" data-service="${key}">${s.enabled===false?'Unavailable':'Open'} →</a></article>`}).join('');
  grid.querySelectorAll('[data-service]').forEach(a=>a.onclick=e=>{if((services[a.dataset.service]||{}).enabled===false)e.preventDefault()});
  $('#discordLink').href=APP_CONFIG.DISCORD_URL;$('#youtubeLink').href=APP_CONFIG.YOUTUBE_URL;$('#aiLink')?.setAttribute('href',APP_CONFIG.AI_URL);
  document.querySelector('[data-logout]')?.addEventListener('click',logout);
  document.querySelectorAll('[data-now]').forEach(x=>x.textContent=new Date().toLocaleString());
}
boot();
