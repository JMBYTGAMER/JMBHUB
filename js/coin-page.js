import {auth,db,app} from './core/firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {doc,onSnapshot,collection,query,where,getDocs} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:8});
const call=name=>{
 if(!app)throw new Error('Coin services are not configured.');
 return httpsCallable(getFunctions(app,'asia-south1'),name);
};
let user=null,unsubWallet=null,unsubPerks=null,unsubInbox=null,owned={},adCredits=0;
const items=[
 {id:'supporter',perk:'supporter',icon:'⭐',name:'JMB Supporter Badge',price:25,desc:'Unlock a supporter badge for your JMB profile.'},
 {id:'profile-glow',perk:'profile-glow',icon:'✨',name:'Profile Glow',price:50,desc:'Unlock a glowing profile style.'},
 {id:'name-highlight',perk:'name-highlight',icon:'🌟',name:'Name Highlight',price:100,desc:'Unlock a highlighted display-name style.'},
 {id:'vip-dashboard',perk:'vip-dashboard',icon:'💎',name:'VIP Dashboard Theme',price:250,desc:'Unlock the premium dashboard theme.'},
 {id:'creator-pack',perk:'creator-pack',icon:'🚀',name:'Creator Pack',price:500,desc:'Unlock the creator profile pack.'}
];
function toast(message,kind=''){
 const el=document.createElement('div');el.className='toast '+kind;el.textContent=message;document.body.append(el);
 window.setTimeout(()=>el.remove(),3400);
}
function renderStore(){
 const grid=$('#coinStore');if(!grid)return;
 grid.innerHTML=items.map(x=>{
  const bought=!!owned[x.perk];
  return '<article class="card coin-item"><div class="service-art" style="font-size:40px">'+x.icon+'</div><h3>'+esc(x.name)+'</h3><p class="muted">'+esc(x.desc)+'</p><div class="price">🪙 '+x.price+' coins</div><button class="btn '+(bought?'btn-ghost':'btn-primary')+' buy-item" data-id="'+x.id+'" '+(bought?'disabled':'')+'>'+(bought?'✓ Owned':'Unlock item')+'</button></article>';
 }).join('');
 grid.querySelectorAll('.buy-item').forEach(b=>b.addEventListener('click',()=>buy(b)));
}
function renderPerks(){
 const box=$('#userPerks');if(!box)return;
 const names={supporter:'⭐ JMB Supporter','profile-glow':'✨ Profile Glow','name-highlight':'🌟 Name Highlight','vip-dashboard':'💎 VIP Dashboard','creator-pack':'🚀 Creator Pack'};
 const active=Object.entries(names).filter(([k])=>owned[k]).map(([,label])=>'<span class="jmb-perk-chip">'+label+'</span>');
 if(adCredits>0)active.push('<span class="jmb-perk-chip">📢 Ad credits: '+money(adCredits)+'</span>');
 box.innerHTML=active.length?active.join(''):'<span class="muted">No special perks unlocked yet.</span>';
}
function dateText(value){
 try{const d=value?.toDate?value.toDate():(value instanceof Date?value:new Date(value));return Number.isNaN(d.getTime())?'':d.toLocaleString()}catch{return ''}
}
async function loadTransactions(){
 const box=$('#coinTransactions');if(!box||!user)return;
 try{
  const {data}=await call('getCoinWallet')({});
  owned=data.entitlements||owned;adCredits=Number(data.adCredits||0);
  $('#coinBalance').textContent=money(data.balance);
  renderPerks();renderStore();
  const tx=data.transactions||[];
  box.innerHTML=tx.length?tx.map(x=>{
   const amount=Number(x.amount||0);
   return '<article class="coin-tx"><div><b>'+esc(x.description||'JMB Coin transaction')+'</b><small class="muted" style="display:block">'+esc(dateText(x.createdAt))+'</small></div><strong class="'+(amount>=0?'plus':'minus')+'">'+(amount>=0?'+':'')+money(amount)+' <small>JMB</small></strong></article>';
  }).join(''):'<div class="empty">No transactions yet. Finish a supported game to earn your first JMB Coin.</div>';
  $('#coinStatus').textContent='Wallet connected. JMB Coins are virtual website credits only; they are not cash and cannot be withdrawn.';
 }catch(e){
  box.innerHTML='<div class="empty">Transaction history is temporarily unavailable.</div>';
  $('#coinStatus').textContent=e?.message||'Could not load the JMB Coin wallet.';
 }
}
function renderInbox(snapshot){
 const box=$('#coinInbox');if(!box)return;
 const notices=snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
 if(!notices.length){box.innerHTML='<div class="empty">You are all caught up. Admin gifts and account updates will appear here.</div>';return}
 box.innerHTML=notices.map(n=>{
  const pending=n.type==='admin_gift'&&n.status==='pending'&&Number(n.amount)>0;
  const claimed=n.type==='admin_gift'&&n.status==='claimed';
  const amount=Number(n.amount||0);
  return '<article class="coin-tx coin-notice"><div style="min-width:0;flex:1"><b>'+esc(n.title||'JMB HUB notice')+'</b><p style="margin:6px 0">'+esc(n.message||'You have a new account notification.')+'</p><small class="muted">'+esc(dateText(n.createdAt))+'</small>'+(pending?'<div style="margin-top:12px"><button class="btn btn-primary collect-coin-gift" data-id="'+esc(n.id)+'">🎁 Collect '+esc(money(amount))+' JMB Coins</button></div>':claimed?'<div class="pill" style="margin-top:8px;display:inline-flex">✓ Collected</div>':'')+'</div>'+(pending?'<strong class="plus">+'+esc(money(amount))+' 🪙</strong>':'')+'</article>';
 }).join('');
 box.querySelectorAll('.collect-coin-gift').forEach(btn=>btn.addEventListener('click',()=>collectGift(btn)));
}
async function collectGift(button){
 button.disabled=true;button.textContent='Collecting…';
 try{
  const {data}=await call('claimCoinGift')({giftId:button.dataset.id});
  $('#coinBalance').textContent=money(data.balance);
  window.JMBMusic?.win?.();
  toast('Reward collected: +'+money(data.amount)+' JMB Coins','good');
  await loadTransactions();
 }catch(e){
  toast(e?.message||'Could not collect this reward.');button.disabled=false;button.textContent='🎁 Collect reward';
 }
}
async function buy(button){
 const item=items.find(x=>x.id===button.dataset.id);if(!item)return;
 button.disabled=true;button.textContent='Processing…';
 try{
  if(!user)throw new Error('Please sign in to use the store.');
  const {data}=await call('purchaseCoinItem')({itemId:item.id});
  if(!data?.ok)throw new Error('Purchase was not completed.');
  owned=data.perks||owned;adCredits=Number(data.adCredits??adCredits);
  $('#coinBalance').textContent=money(data.balance);renderStore();renderPerks();
  window.JMBMusic?.win?.();toast('Unlocked '+item.name+' ✓','good');
  $('#coinStatus').textContent='Item unlocked. Your virtual coin balance is '+money(data.balance)+'.';
  await loadTransactions();
 }catch(e){toast(e?.message||'Purchase failed.');button.disabled=false;button.textContent='Unlock item'}
}
$('#refreshCoinInbox')?.addEventListener('click',async()=>{if(!user||!db)return;const button=$('#refreshCoinInbox');button.disabled=true;try{const snapshot=await getDocs(query(collection(db,'coinNotifications'),where('uid','==',user.uid)));renderInbox(snapshot);await loadTransactions()}catch{toast('Could not refresh inbox. Try again.')}finally{button.disabled=false}});
onAuthStateChanged(auth,u=>{
 user=u||null;unsubWallet?.();unsubWallet=null;unsubPerks?.();unsubPerks=null;unsubInbox?.();unsubInbox=null;
 if(!u){location.replace('login.html?next=coins.html');return}
 if(db){
  unsubWallet=onSnapshot(doc(db,'wallets',u.uid),snap=>{
   $('#coinBalance').textContent=money(snap.exists()?snap.data().balance||0:0);
  },()=>{$('#coinStatus').textContent='Live wallet updates are unavailable; refresh to retry.'});
  unsubPerks=onSnapshot(doc(db,'userEntitlements',u.uid),snap=>{
   const ent=snap.exists()?snap.data():{};owned=ent.perks||{};adCredits=Number(ent.adCredits||0);renderPerks();renderStore();
  },()=>{});
  if($('#coinInbox'))unsubInbox=onSnapshot(query(collection(db,'coinNotifications'),where('uid','==',u.uid)),renderInbox,()=>{
   const box=$('#coinInbox');if(box)box.innerHTML='<div class="empty">Inbox temporarily unavailable. Refresh and try again.</div>';
  });
 }
 loadTransactions();
});
renderStore();
