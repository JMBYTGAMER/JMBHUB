import {APP_CONFIG} from './config/app-config.js';
import {guard,logout} from './core/auth-guard.js';
import {db,backendReady} from './core/firebase.js';
import {doc,getDoc,collection,addDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {$,esc,toast} from './core/ui.js';

const defaults=APP_CONFIG.SERVICES;
const cards=[
 ['games','🎮','JMB Games','Play 16+ mini-games, chase scores and climb the leaderboard.','games.html'],
 ['area','🧰','JMB Area','Calculator, QR, JSON, code, converters, timers and more.','jmb-area.html'],
 ['minecraft','⛏️','Minecraft Area','Command builders, kits, effects, gamerules and more.','minecraft.html'],
 ['ai','🤖','JMB AI','Open your JMB AI service in one click.','ai.html'],
 ['support','🎫','Support','Create and track support tickets.','support.html']
];
async function loadServices(){
 let services={...defaults};
 try{const local=JSON.parse(localStorage.getItem('jmb-service-settings')||'{}');Object.keys(local).forEach(k=>services[k]={...services[k],...local[k]})}catch{}
 if(backendReady&&db){try{const snap=await getDoc(doc(db,'settings','portal'));if(snap.exists()&&snap.data().services)services={...services,...snap.data().services}}catch{}}
 return services;
}
async function sendSuggestion(u){
 const text=$('#suggestionText')?.value.trim();if(!text)return toast('Write a suggestion first');
 if(!backendReady||u.demo)return toast('Please sign in with account services enabled.');
 try{await addDoc(collection(db,'suggestions'),{uid:u.uid,email:u.email||'',text:text.slice(0,500),status:'new',createdAt:serverTimestamp()});$('#suggestionText').value='';$('#suggestionStatus').textContent='Sent ✓';$('#suggestionStatus').classList.remove('hide');toast('Suggestion sent','good')}catch(e){toast('Could not send suggestion: '+e.message)}
}
async function boot(){
 const u=await guard(),services=await loadServices(),grid=$('#serviceGrid');
 grid.innerHTML=cards.map(([key,icon,title,desc,url])=>{const s=services[key]||{enabled:true};return `<article class="card service-card ${s.enabled===false?'service-off':''}"><div class="service-art">${icon}</div><h3>${esc(title)}</h3><p>${esc(s.enabled===false?s.message:desc)}</p><a class="btn ${s.enabled===false?'btn-ghost':'btn-primary'} open" href="${s.enabled===false?'#':url}" data-service="${key}">${s.enabled===false?'Maintenance':'Open'} →</a></article>`}).join('');
 grid.querySelectorAll('[data-service]').forEach(a=>a.onclick=e=>{if((services[a.dataset.service]||{}).enabled===false)e.preventDefault()});
 if($('#discordLink'))$('#discordLink').href=APP_CONFIG.DISCORD_URL;if($('#youtubeLink'))$('#youtubeLink').href=APP_CONFIG.YOUTUBE_URL;
 $('#firebaseState').textContent=backendReady?'Ready':'Offline';
 document.querySelector('[data-logout]')?.addEventListener('click',e=>{e.preventDefault();logout()});
 document.querySelectorAll('[data-now]').forEach(x=>x.textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
 $('#sendSuggestion')?.addEventListener('click',()=>sendSuggestion(u));
}
boot();
