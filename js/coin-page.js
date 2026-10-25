import {auth,db,app} from '../js/core/firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:8});
const call=name=>{if(!app)throw new Error('Coin services are not configured.');return httpsCallable(getFunctions(app,'asia-south1'),name)};
let user=null,unsubWallet=null,owned={},adCredits=0;

const items=[
 {id:'supporter',perk:'supporter',icon:'⭐',name:'JMB Supporter Badge',price:25,desc:'Unlock a supporter badge for your JMB profile.'},
 {id:'profile-glow',perk:'profile-glow',icon:'✨',name:'Profile Glow',price:50,desc:'Unlock a glowing profile style.'},
 {id:'name-highlight',perk:'name-highlight',icon:'🌟',name:'Name Highlight',price:100,desc:'Unlock a highlighted display-name style.'},
 {id:'vip-dashboard',perk:'vip-dashboard',icon:'💎',name:'VIP Dashboard Theme',price:250,desc:'Unlock the premium dashboard theme.'},
 {id:'creator-pack',perk:'creator-pack',icon:'🚀',name:'Creator Pack',price:500,desc:'Unlock the creator profile pack.'}
];
function toast(message,kind=''){
 const el=document.createElement('div');el.className='toast '+kind;el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3400);
}
function renderStore(){
 const grid=$('#coinStore');if(!grid)return;
 grid.innerHTML=items.map(x=>{
  const isOwned=x.perk!=='ad-credit'&&!!owned[x.perk];
  return `<article class="card coin-item"><div class="service-art" style="font-size:40px">${x.icon}</div><h3>${x.name}</h3><p class="muted">${x.desc}</p><div class="price">🪙 ${x.price} coins</div><button class="btn ${isOwned?'btn-ghost':'btn-primary'} buy-item" data-id="${x.id}" ${isOwned?'disabled':''}>${isOwned?'✓ Owned':'Unlock item'}</button></article>`;
 }).join('');
 grid.querySelectorAll('.buy-item').forEach(b=>b.onclick=()=>buy(b));
}
function renderPerks(){
 const box=$('#userPerks');if(!box)return;
 const names={supporter:'⭐ JMB Supporter', 'profile-glow':'✨ Profile Glow','name-highlight':'🌟 Name Highlight','vip-dashboard':'💎 VIP Dashboard','creator-pack':'🚀 Creator Pack'};
 const active=Object.entries(names).filter(([k])=>owned[k]).map(([,name])=>'<span class="jmb-perk-chip">'+name+'</span>');
 if(adCredits>0)active.push('<span class="jmb-perk-chip">📢 Ad credits: '+adCredits+'</span>');
 box.innerHTML=active.length?active.join(''):'<span class="muted">No special perks unlocked yet.</span>';
}
async function loadTransactions(){
 const box=$('#coinTransactions');if(!box||!user)return;
 try{
  const r=await call('getCoinWallet')({});
  owned=r.data.entitlements||{};adCredits=Number(r.data.adCredits||0);renderPerks();renderStore();
  const tx=r.data.transactions||[];
  box.innerHTML=tx.length?tx.map(x=>{
   const amount=Number(x.amount||0),time=x.createdAt?new Date(x.createdAt).toLocaleString():'';
   return `<article class="coin-tx"><div><b>${esc(x.description||'JMB Coin transaction')}</b><small class="muted" style="display:block">${esc(time)}</small></div><strong class="${amount>=0?'plus':'minus'}">${amount>=0?'+':''}${money(amount)} <small>JMB</small></strong></article>`;
  }).join(''):'<div class="empty">No transactions yet. Finish a supported game to earn your first JMB Coin.</div>';
  $('#coinStatus').textContent='Wallet and ledger are connected. JMB Coins are virtual credits only; they have no cash value.';
 }catch(e){box.innerHTML='<div class="empty">Transaction history is temporarily unavailable.</div>';$('#coinStatus').textContent=e?.message||'Could not load the JMB Coin wallet.'}
}
async function buy(button){
 const item=items.find(x=>x.id===button.dataset.id);if(!item)return;
 button.disabled=true;button.textContent='Processing…';
 try{
  if(!user)throw new Error('Please sign in to use the store.');
  const r=await call('purchaseCoinItem')({itemId:item.id});
  if(!r.data?.ok)throw new Error('Purchase was not completed.');
  owned=r.data.perks||owned;adCredits=Number(r.data.adCredits||adCredits);
  $('#coinBalance').textContent=money(r.data.balance);
  renderStore();renderPerks();
  window.JMBMusic?.win?.();
  toast('Unlocked '+item.name+' ✓','good');
  $('#coinStatus').textContent='Item unlocked. Your virtual coin balance is '+money(r.data.balance)+'.';
  await loadTransactions();
 }catch(e){toast(e?.message||'Purchase failed.');button.disabled=false;button.textContent='Unlock item'}
}
onAuthStateChanged(auth,u=>{
 user=u||null;unsubWallet?.();unsubWallet=null;
 if(!u){location.replace('login.html?next=coins.html');return}
 if(db)unsubWallet=onSnapshot(doc(db,'wallets',u.uid),snap=>{
  const balance=Number(snap.exists()?snap.data().balance||0:0);
  $('#coinBalance').textContent=money(balance);
 },()=>{$('#coinStatus').textContent='Live wallet updates are unavailable; refresh to retry.'});
 loadTransactions();
});
renderStore();
