import {auth,db} from '../js/core/firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {doc,onSnapshot,collection,query,where,orderBy,limit,getDocs,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>Number(n||0).toFixed(8).replace(/0+$/,'').replace(/\.$/,'')||'0';
let user,unsub;

const items=[
 {id:'supporter',icon:'⭐',name:'JMB Supporter Badge',price:25,desc:'Adds a supporter badge to your JMB profile.'},
 {id:'profile-glow',icon:'✨',name:'Profile Glow',price:50,desc:'Unlocks the profile glow style.'},
 {id:'name-highlight',icon:'🌟',name:'Name Highlight',price:100,desc:'Unlocks a highlighted display name style.'},
 {id:'ad-credit',icon:'📢',name:'Ad Credit',price:100,desc:'One internal JMBHUB ad credit.'},
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
  if(!user||!db)throw new Error('JMB Coin services are unavailable.');
  const purchaseRef=doc(collection(db,'coinPurchases'));
  const txRef=doc(collection(db,'coinTransactions'));
  const walletRef=doc(db,'wallets',user.uid);
  const result=await runTransaction(db,async t=>{
   const snap=await t.get(walletRef);
   const balance=Number(snap.exists()?snap.data().balance||0:0);
   if(balance<item.price)throw new Error(`You need ${item.price} coins, but only have ${money(balance)}.`);
   const next=Number((balance-item.price).toFixed(8));
   t.set(walletRef,{uid:user.uid,balance:next,updatedAt:serverTimestamp()},{merge:true});
   t.set(purchaseRef,{uid:user.uid,itemId:item.id,price:item.price,name:item.name,createdAt:serverTimestamp()});
   t.set(txRef,{uid:user.uid,amount:-item.price,type:'purchase',description:`Purchased ${item.name}`,createdAt:serverTimestamp()});
   return next;
  });
  toast(`Purchased ${item.name} ✓`,'good');
  $('#coinStatus').textContent=`Purchased! Remaining balance: ${money(result)} coins.`;
  await loadTransactions();
 }catch(e){toast(e?.message||'Purchase failed.')}
 finally{button.disabled=false}
}
async function loadTransactions(){
 const box=$('#coinTransactions');if(!box||!user)return;
 try{
  const q=query(collection(db,'coinTransactions'),where('uid','==',user.uid),orderBy('createdAt','desc'),limit(30));
  const snap=await getDocs(q);
  const wallet=await getDocs(query(collection(db,'coinTransactions'),where('uid','==',user.uid),limit(1))).catch(()=>null);
  const tx=snap.docs.map(d=>{const x=d.data();return{id:d.id,amount:Number(x.amount||0),description:x.description||'JMB Coin transaction',createdAt:x.createdAt?.toDate?.()?.toLocaleString?.()||''}});
  if(!$('#coinBalance').textContent)$('#coinBalance').textContent='0';
  box.innerHTML=tx.length?tx.map(x=>`<div class="coin-tx"><div><b>${esc(x.description)}</b><small class="muted" style="display:block">${esc(x.createdAt)}</small></div><strong class="${x.amount>=0?'plus':'minus'}">${x.amount>=0?'+':''}${money(x.amount)}</strong></div>`).join(''):'<div class="empty">No transactions yet.</div>';
 }catch(e){$('#coinStatus').textContent='Transaction history will appear after your first purchase.'}
}
function toast(message,kind=''){
 const el=document.createElement('div');el.className='toast '+kind;el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3200)
}
onAuthStateChanged(auth,u=>{
 user=u||null;unsub?.();unsub=null;
 if(!u){location.replace('login.html?next=coins.html');return}
 if(db){
  unsub=onSnapshot(doc(db,'wallets',u.uid),snap=>{
   const balance=snap.exists()?snap.data().balance:0;
   $('#coinBalance').textContent=money(balance);
   $('#coinReference').textContent=`Reference value: $${money(Number(balance)/100)}`;
  },()=>{});
 }
 loadTransactions();
});
renderStore();
