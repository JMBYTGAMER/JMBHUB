import {auth,db,app} from './firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {collection,query,where,onSnapshot,doc} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coins=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:8});
let notices=[],unsubscribe=null,unsubscribePerks=null,initialized=false,seenPending=new Set(),firstSnapshot=true,user=null;

function build(){
 if(initialized)return;
 initialized=true;
 const button=document.createElement('button');
 button.id='jmbInboxToggle';button.className='jmb-inbox-toggle';button.type='button';
 button.setAttribute('aria-label','Open rewards and notifications');button.innerHTML='<span aria-hidden="true">✉️</span><span class="jmb-inbox-count" id="jmbInboxCount">0</span>';
 const panel=document.createElement('section');panel.id='jmbInboxPanel';panel.className='jmb-inbox-panel';panel.hidden=true;
 panel.setAttribute('aria-label','JMB notifications');
 panel.innerHTML='<header class="jmb-inbox-head"><div><b>Rewards & messages</b><small>Admin gifts and account updates</small></div><button type="button" class="jmb-inbox-close" aria-label="Close notifications">×</button></header><div class="jmb-inbox-list" id="jmbInboxList"><div class="jmb-inbox-empty">Your inbox will appear here.</div></div>';
 document.body.append(button,panel);
 button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));});
 panel.querySelector('.jmb-inbox-close').addEventListener('click',()=>{panel.hidden=true;button.setAttribute('aria-expanded','false')});
 panel.addEventListener('click',async e=>{
  const claim=e.target.closest('[data-claim-gift]');
  if(!claim)return;
  if(!app||!user)return;
  const id=claim.dataset.claimGift;
  claim.disabled=true;claim.textContent='Collecting…';
  try{
   const call=httpsCallable(getFunctions(app,'asia-south1'),'claimCoinGift');
   await call({giftId:id});
   const notice=notices.find(n=>n.id===id);
   if(notice)notice.status='claimed';
   window.JMBMusic?.win?.();
   render();
  }catch(err){
   claim.disabled=false;claim.textContent='Collect reward';
   const status=claim.closest('.jmb-notice-card')?.querySelector('.jmb-notice-status');
   if(status)status.textContent=err?.message||'Unable to collect this reward. Please try again.';
  }
 });
}
function render(){
 const button=document.getElementById('jmbInboxToggle');
 const count=document.getElementById('jmbInboxCount');
 const list=document.getElementById('jmbInboxList');
 if(!button||!count||!list)return;
 const pending=notices.filter(n=>n.status==='pending'&&n.type==='admin_gift').length;
 count.textContent=pending>99?'99+':String(pending);
 count.hidden=pending===0;
 button.setAttribute('aria-label',pending?pending+' unclaimed JMB rewards':'Open JMB notifications');
 if(!notices.length){list.innerHTML='<div class="jmb-inbox-empty"><span>✨</span><b>All caught up</b><p>Admin rewards and account updates will appear here.</p></div>';return}
 list.innerHTML=notices.map(n=>{
   const isGift=n.status==='pending'&&n.type==='admin_gift'&&Number(n.amount)>0;
   const claimed=n.status==='claimed';
   const time=n.createdAt?.toDate?.()?n.createdAt.toDate().toLocaleString():n.createdAt?.seconds?new Date(n.createdAt.seconds*1000).toLocaleString():'';
   return '<article class="jmb-notice-card '+(isGift?'is-gift':'')+(claimed?' collected':'')+'"><div class="jmb-notice-icon">'+(isGift?'🎁':n.type==='ad_update'?'📢':n.type==='perk_update'?'✨':'✉️')+'</div><div class="jmb-notice-body"><b>'+esc(n.title||'JMB HUB message')+'</b><p>'+esc(n.message||'You have a new JMB HUB update.')+'</p>'+(isGift?'<strong class="jmb-notice-amount">🪙 +'+coins(n.amount)+' JMB Coins</strong>':'')+'<small>'+esc(time)+'</small><small class="jmb-notice-status">'+(claimed?'Collected':isGift?'Ready to collect':'Account notification')+'</small>'+(isGift?'<button class="btn btn-primary jmb-collect-btn" data-claim-gift="'+esc(n.id)+'">Collect reward</button>':'')+'</div></article>';
 }).join('');
}
function subscribe(u){
 unsubscribe?.();unsubscribe=null;unsubscribePerks?.();unsubscribePerks=null;notices=[];seenPending=new Set();firstSnapshot=true;user=u||null;
 document.body.classList.remove('jmb-perk-glow','jmb-perk-vip','jmb-perk-creator','jmb-perk-supporter');
 if(!u||!db){document.getElementById('jmbInboxToggle')?.remove();document.getElementById('jmbInboxPanel')?.remove();initialized=false;return}
 build();
 unsubscribePerks=onSnapshot(doc(db,'userEntitlements',u.uid),snap=>{
  const perks=snap.exists()?(snap.data().perks||{}):{};
  document.body.classList.toggle('jmb-perk-glow',!!perks['profile-glow']);
  document.body.classList.toggle('jmb-perk-vip',!!perks['vip-dashboard']);
  document.body.classList.toggle('jmb-perk-creator',!!perks['creator-pack']);
  document.body.classList.toggle('jmb-perk-supporter',!!perks.supporter);
  document.querySelectorAll('#userName,.user-name,[data-user-name]').forEach(el=>el.classList.toggle('jmb-perk-name',!!perks['name-highlight']));
 },()=>{});
 const q=query(collection(db,'coinNotifications'),where('uid','==',u.uid));
 unsubscribe=onSnapshot(q,snap=>{
  const incoming=snap.docs.map(d=>({id:d.id,...d.data()}));
  const nextPending=new Set(incoming.filter(n=>n.status==='pending'&&n.type==='admin_gift').map(n=>n.id));
  if(!firstSnapshot&&[...nextPending].some(id=>!seenPending.has(id)))window.JMBMusic?.notify?.();
  firstSnapshot=false;seenPending=nextPending;
  notices=incoming.sort((a,b)=>{
    const at=a.createdAt?.toMillis?.()||a.createdAt?.seconds*1000||0;
    const bt=b.createdAt?.toMillis?.()||b.createdAt?.seconds*1000||0;
    return bt-at;
  });
  render();
 },()=>{const list=document.getElementById('jmbInboxList');if(list)list.innerHTML='<div class="jmb-inbox-empty">Notifications are temporarily unavailable.</div>'});
}
if(auth)onAuthStateChanged(auth,subscribe);
