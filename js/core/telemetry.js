import {db,backendReady} from './firebase.js';
import {collection,addDoc,doc,getDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

let user=null,mode='normal',queue=[],timer=null,ready=false;
const key='jmb-telemetry-mode';
function cleanText(v){return String(v||'').replace(/\s+/g,' ').trim().slice(0,80)}
async function loadMode(){
  try{const cached=sessionStorage.getItem(key);if(cached)mode=cached}catch{}
  if(!backendReady||!db)return;
  try{const snap=await getDoc(doc(db,'settings','telemetry'));if(snap.exists()){const m=snap.data().mode;if(['low','normal','extreme'].includes(m))mode=m;sessionStorage.setItem(key,mode)}}catch{}
}
function enqueue(event,data={}){
  if(!user||!backendReady||!db)return;
  const base={uid:user.uid,event,page:location.pathname.split('/').pop()||'index.html',at:Date.now(),mode};
  if(mode==='extreme'&&data.x!=null){base.x=Math.round((data.x/innerWidth)*1000)/1000;base.y=Math.round((data.y/innerHeight)*1000)/1000}
  if(data.target)base.target=cleanText(data.target);
  if(data.game)base.game=cleanText(data.game);
  if(data.route)base.route=cleanText(data.route);
  if(data.meta)base.meta=cleanText(data.meta);
  queue.push(base);if(queue.length>=8)flush();
}
async function flush(){if(!queue.length||!user||!backendReady)return;const batch=queue.splice(0,12);for(const item of batch){try{await addDoc(collection(db,'logs'),{...item,createdAt:serverTimestamp()})}catch{}}}
function targetName(el){return el?.dataset?.log||el?.getAttribute?.('aria-label')||el?.getAttribute?.('href')||el?.textContent||el?.tagName||''}
export async function initTelemetry(u){
 if(ready||!u||u.demo)return;ready=true;user=u;await loadMode();
 enqueue('page_view',{route:location.pathname});
 document.addEventListener('click',e=>{
   const el=e.target.closest('a,button,[role="button"],[data-game],[data-tool],[data-mc]');
   if(!el)return;
   const game=el.dataset.game,tool=el.dataset.tool,mc=el.dataset.mc;
   const target=game?'game:'+game:tool?'tool:'+tool:mc?'minecraft:'+mc:targetName(el);
   enqueue(game?'game_played':'click',{target,game,meta:el.getAttribute('href')||''});
 },{passive:true});
 if(mode==='extreme')document.addEventListener('pointerdown',e=>enqueue('pointer_click',{x:e.clientX,y:e.clientY}),{passive:true});
 timer=setInterval(flush,9000);addEventListener('pagehide',flush,{capture:true});
}
export function logEvent(event,data={}){enqueue(event,data)}
