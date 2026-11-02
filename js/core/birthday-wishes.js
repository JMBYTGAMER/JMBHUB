import {db} from './firebase.js';
import {collection,getDocs,limit,query} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
const root=document.getElementById('communityCelebrations');
if(root){
 const heading=document.getElementById('holidayGreeting'),list=document.getElementById('communityBirthdayList');
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 const today=Date.UTC(p.year,p.month-1,p.day),dayMs=86400000;
 const escText=v=>String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const label=(m,d)=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2024,m-1,d)));
 const nextDate=(m,d)=>{let y=p.year,x=new Date(Date.UTC(y,m-1,d));if(x.getUTCMonth()!==m-1)x=new Date(Date.UTC(y,m,0));if(x.getTime()<today){y++;x=new Date(Date.UTC(y,m-1,d));if(x.getUTCMonth()!==m-1)x=new Date(Date.UTC(y,m,0));}return x};
 const sendWish=async name=>{const msg='Happy birthday, '+name+'! 🎂🎉 Wishing you a wonderful day from the JMB HUB community!';try{if(navigator.share){await navigator.share({text:msg});return}await navigator.clipboard.writeText(msg);alert('Birthday wish copied!')}catch(e){if(e?.name!=='AbortError')alert(msg)}};
 const render=entries=>{
  const items=entries.map(x=>{const date=nextDate(x.month,x.day);return {...x,date,days:Math.round((date.getTime()-today)/dayMs)}}).sort((a,b)=>a.days-b.days||String(a.displayName).localeCompare(String(b.displayName)));
  const todays=items.filter(x=>x.days===0);
  if(p.month===1&&p.day===1)heading.textContent='🎆 Happy New Year '+p.year+' from JMB HUB!';
  else if(todays.length)heading.textContent='🎂 Happy Birthday to '+todays.map(x=>x.displayName||'JMB HUB member').join(', ')+'!';
  else heading.textContent='🎉 Celebrate birthdays and special days together.';
  if(!items.length){list.innerHTML='<div class="community-birthday-empty"><strong>No public birthdays yet.</strong><span>Add yours from your profile and let the JMB HUB community celebrate with you.</span><a href="'+(location.pathname.includes('/pages/')?'profile.html':'pages/login.html?next=profile.html')+'">Add your birthday →</a></div>';return}
  list.innerHTML=items.slice(0,12).map(x=>{const name=escText(x.displayName||'JMB HUB member'),when=x.days===0?'🎉 Today is their day!':x.days===1?'Tomorrow':'In '+x.days+' days';return '<article class="community-birthday-card'+(x.days===0?' is-today':'')+'"><span class="community-birthday-icon" aria-hidden="true">'+(x.days===0?'🎂':'🎈')+'</span><div class="community-birthday-copy"><strong>'+name+'</strong><span>'+label(x.month,x.day)+' · '+when+'</span></div><button class="community-wish-button" type="button" data-wish-name="'+name+'">Send a wish</button></article>'}).join('');
  list.querySelectorAll('[data-wish-name]').forEach(b=>b.addEventListener('click',()=>sendWish(b.dataset.wishName||'JMB HUB member')));
 };
 if(!db)list.innerHTML='<div class="community-birthday-empty">Community birthdays are temporarily unavailable.</div>';
 else getDocs(query(collection(db,'birthdayDirectory'),limit(300))).then(s=>render(s.docs.map(d=>{const x=d.data(),m=Number(x.month),day=Number(x.day);return Number.isInteger(m)&&m>=1&&m<=12&&Number.isInteger(day)&&day>=1&&day<=31?{displayName:String(x.displayName||'JMB HUB member').slice(0,50),month:m,day}:null}).filter(Boolean))).catch(e=>{console.warn('[JMBHUB] Birthday list unavailable.',e?.code||e?.message||e);list.innerHTML='<div class="community-birthday-empty">Birthday list is unavailable right now. Please try again later.</div>'});
}
