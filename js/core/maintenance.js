import {auth,db} from './firebase.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
if(db){
 try{
  await auth?.authStateReady?.();
  const current=auth?.currentUser;
  if(current){
   const claims=(await current.getIdTokenResult()).claims||{};
   const verified=Boolean(current.emailVerified);
   if(verified&&(current.email?.toLowerCase()==='jobinmathewbiju@gmail.com'||claims.admin===true||claims.role==='admin'))throw new Error('JMB_ADMIN_BYPASS');
  }
  const snap=await getDoc(doc(db,'settings','portal'));
  const m=snap.exists()?snap.data().maintenance:null;
  if(m?.enabled){
   const box=document.createElement('div');box.className='jmb-maintenance-screen';
   box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','JMB HUB maintenance');
   box.innerHTML='<div class="jmb-maintenance-card" tabindex="-1"><div class="jmb-maintenance-icon">🛠️</div><div class="eyebrow">JMBHUB MAINTENANCE</div><h1>We’ll be right back</h1><p></p><div class="jmb-maintenance-bar"><span></span></div><small>The portal is temporarily paused while maintenance is in progress.</small></div>';
   box.querySelector('p').textContent=m.message||'JMBHUB is temporarily in full maintenance mode. Please check back soon.';
   document.body.append(box);document.body.classList.add('jmb-maintenance-active');
   [...document.body.children].forEach(el=>{if(el!==box){el.inert=true;el.setAttribute('aria-hidden','true')}});
  }
 }catch(e){if(e?.message!=='JMB_ADMIN_BYPASS')console.warn('[JMBHUB] Maintenance check unavailable:',e?.code||e?.message||e)}
}