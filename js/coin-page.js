import {auth,db,app,backendReady} from '../js/core/firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>Number(n||0).toFixed(8).replace(/0+$/,'').replace(/\.$/,'')||'0';
let user,unsub,fn;

function functionsClient(){if(!app)return null;return fn||(fn=getFunctions(app,'asia-south1'))}
function call(name,data={}){const f=functionsClient();if(!f)return Promise.reject(new Error('JMB Coin services are unavailable.'));return httpsCallable(f,name)(data)}

const items=[
 {id:'supporter',icon:'⭐',name:'JMB Supporter Badge',price:25,desc:'Adds a supporter badge to your JMB profile.'},
 {id:'profile-glow',icon:'✨',name:'Profile Glow',price:50,desc:'Unlocks the profile glow style.'},
 {id:'name-highlight',icon:'🌟',name:'Name Highlight',price:100,desc:'Unlocks a highlighted display name style.'},
 {id:'ad-credit',icon:'📢',name:'Ad Credit',price:100,desc:'One internal JMBHUB ad credit. Ads remain subject to review.'},
 {id:'vip-dashboard',icon:'💎',name:'VIP Dashboard Theme',price:250,desc:'Unlocks a premium dashboard theme.'},
 {id:'creator-pack',icon:'🚀',name:'Creator Pack',price:500,desc:'Unlocks the JMB creator profile pack.'}
];

function renderStore(){
 const grid=$('#coinStore');if(!grid)return;
 grid.innerHTML=items.map(x=>`<article class="card coin-item"><div class="service-art" style="font-size:40px">${x.icon}</div><h3>${x.name}</h3><p class="muted">${x.desc}</p><div class="price">🪙 ${x.price} coins</div><button class="btn btn-primary buy-item" data-id="${x.id}">Buy</button></article>`).join('');
 grid.querySelectorAll('.buy-item').forEach(b=>b.onclick=()=>buy(b));
}
async function buy(button){
 button.disabled=true;
 try{
  const item=items.find(x=>x.id===button.dataset.id);
  const res=await call('purchaseCoinItem',{itemId:item.id});
  toast(`Purchased ${item.name} ✓`,'good');
  $('#coinStatus').textContent=`Purchased! Remaining balance: ${money(res.data?.balance)} coins.`;
  await loadTransactions();
 }catch(e){toast(e?.message||'Purchase failed.')}
 finally{button.disabled=false}
}
async function loadTransactions(){
 const box=$('#coinTransactions');if(!box||!user)return;
 try{
  const res=await call('getCoinWallet');
  $('#coinBalance').textContent=money(res.data?.balance);
  $('#coinReference').textContent=`Reference value: $${money((Number(res.data?.balance||0))/100)}`;
  const tx=res.data?.transactions||[];
  box.innerHTML=tx.length?tx.map(x=>`<div class="coin-tx"><div><b>${esc(x.description||'JMB Coin transaction')}</b><small class="muted" style="display:block">${esc(x.createdAt||'')}</small></div><strong class="${Number(x.amount)>=0?'plus':'minus'}">${Number(x.amount)>=0?'+':''}${money(x.amount)}</strong></div>`).join(''):'<div class="empty">No transactions yet.</div>';
 }catch(e){$('#coinStatus').textContent=e?.message||'Coin services are not deployed yet.'}
}
function toast(message,kind=''){
 const el=document.createElement('div');el.className='toast '+kind;el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3200)
}
onAuthStateChanged(auth,u=>{
 user=u||null;unsub?.();unsub=null;
 if(!u){location.replace('login.html?next=coins.html');return}
 if(backendReady&&db){
  unsub=onSnapshot(doc(db,'wallets',u.uid),snap=>{$('#coinBalance').textContent=money(snap.exists()?snap.data().balance:0)},()=>{});
 }
 loadTransactions();
});
renderStore();
