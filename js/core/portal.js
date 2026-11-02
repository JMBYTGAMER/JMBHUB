import {auth,db} from './firebase.js';
import '../../css/portal-polish.css';
import '../../css/admin-polish.css';
import './birthday-wishes.js';
import './coin-notifications.js';
import './command-center.js';
import {startGlobalCoin} from '../coin.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {initTelemetry} from './telemetry.js';
import './sound.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
/* Shared JMBHUB portal behavior */
const links=[
  ['⌂','Dashboard','dashboard.html'],
  ['🎮','JMB Games','games.html'],
  ['🧰','JMB Area','jmb-area.html'],
  ['🧑‍💻','Developer Toolbox','dev-toolbox.html'],
  ['🔐','Security Lab','security-lab.html'],
  ['⛏️','Minecraft Area','minecraft.html'],
  ['🤖','JMB AI','ai.html'],
  ['🎫','Support','support.html'],
  ['🪙','JMB Coins','coins.html'],
  ['📢','Ad Network','ads.html'],
  ['◉','Profile','profile.html'],
  ['❔','Help & Tutorials','manual.html']
];
function currentPage(){return location.pathname.split('/').pop()||'index.html'}

function makeNav(){
  if(currentPage()==='index.html')return;
  let drawer=document.querySelector('.jmb-mobile-menu');
  let backdrop=document.querySelector('.jmb-drawer-backdrop');
  if(!drawer){
    backdrop=document.createElement('div');
    backdrop.className='jmb-drawer-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    document.body.append(backdrop);
    drawer=document.createElement('aside');
    drawer.className='jmb-mobile-menu';
    drawer.id='jmbMobileMenu';
    drawer.setAttribute('role','dialog');
    drawer.setAttribute('aria-modal','true');
    drawer.setAttribute('aria-label','JMB HUB navigation');
    drawer.setAttribute('aria-hidden','true');
    drawer.inert=true;
    const mainLinks=links.map(([icon,label,url])=>'<a href="'+url+'" data-nav="'+url+'"><span class="menu-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span><span class="menu-arrow" aria-hidden="true">›</span></a>').join('');
    drawer.innerHTML='<div class="jmb-menu-head"><div><span class="menu-title">JMB HUB • NAVIGATION</span><strong>Where do you want to go?</strong><small>Choose a section to open</small></div><button class="jmb-menu-close" type="button" aria-label="Close navigation">×</button></div><div class="jmb-menu-group-label">EXPLORE</div><nav class="jmb-menu-links" aria-label="Main sections">'+mainLinks+'</nav><div class="jmb-menu-group-label jmb-menu-account-label">ACCOUNT &amp; MANAGEMENT</div><nav class="jmb-menu-links" aria-label="Account sections"><a href="admin.html" data-admin-only class="hide"><span class="menu-icon" aria-hidden="true">⚙️</span><span>Admin Console</span><span class="menu-arrow" aria-hidden="true">›</span></a><a href="#" data-menu-logout><span class="menu-icon" aria-hidden="true">↪</span><span>Logout</span><span class="menu-arrow" aria-hidden="true">›</span></a></nav><div class="jmb-menu-foot">JMB HUB <span>•</span> One portal, many experiences</div>';
    document.body.append(drawer);
  }
  const active=currentPage();
  const sidebar=document.querySelector('.sidebar');
  if(sidebar && !sidebar.querySelector('a[href="profile.html"]')){
    const section=document.createElement('div');section.className='side-section';section.setAttribute('data-global-account','');
    section.innerHTML='<div class="side-label">ACCOUNT</div><a class="nav-link" href="profile.html"><span>◉</span><span>Profile</span></a><a class="nav-link" data-admin-only href="admin.html"><span>⚙️</span><span>Admin Console</span></a><a class="nav-link" href="#" data-menu-logout><span>↪</span><span>Logout</span></a>';
    sidebar.append(section);
  }
  drawer.querySelectorAll('[data-nav]').forEach(a=>{
    const isActive=a.getAttribute('data-nav')===active;
    a.classList.toggle('active',isActive);
    if(isActive)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  const buttonSelector='.mobile-menu-btn';
  let button;
  const close=(restoreFocus=true)=>{
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.inert=true;
    drawer.setAttribute('aria-hidden','true');
    backdrop.setAttribute('aria-hidden','true');
    document.body.classList.remove('menu-open');
    button?.setAttribute('aria-expanded','false');
    button?.setAttribute('aria-label','Open navigation');
    if(button)button.innerHTML='<span aria-hidden="true">☰</span><span>Menu</span>';
    if(restoreFocus)button?.focus({preventScroll:true});
  };
  const open=()=>{
    drawer.inert=false;
    drawer.setAttribute('aria-hidden','false');
    backdrop.setAttribute('aria-hidden','false');
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.classList.add('menu-open');
    button?.setAttribute('aria-expanded','true');
    button?.setAttribute('aria-label','Close navigation');
    if(button)button.innerHTML='<span aria-hidden="true">×</span><span>Close</span>';
    drawer.querySelector('[data-nav].active')?.focus({preventScroll:true});
  };
  backdrop.onclick=()=>close();
  drawer.querySelector('.jmb-menu-close')?.addEventListener('click',()=>close());
  drawer.querySelectorAll('[data-nav]').forEach(a=>a.addEventListener('click',()=>close(false)));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&drawer.classList.contains('open')){event.preventDefault();close()}
  });
  document.querySelectorAll('.sidebar [data-menu-logout]').forEach(a=>a.addEventListener('click',async e=>{e.preventDefault();try{const m=await import('./auth-guard.js');await m.logout()}catch{location.href='login.html'}}));
  drawer.querySelector('[data-menu-logout]')?.addEventListener('click',async e=>{
    e.preventDefault();
    try{const m=await import('./auth-guard.js');await m.logout()}catch{location.href='login.html'}
  });
  let head=document.querySelector('.mobile-head');
  if(!head){
    head=document.createElement('div');head.className='mobile-head';
    head.innerHTML='<div class="mobile-head-left"><a class="brand" href="dashboard.html"><span class="brand-mark"><img src="../assets/jmbhub-logo.png" alt="JMB HUB"></span><span><b>JMB</b><small>HUB</small></span></a></div><div class="portal-top-actions"></div>';
    document.body.prepend(head);
  }
  let left=head.querySelector('.mobile-head-left');
  if(!left){left=document.createElement('div');left.className='mobile-head-left';head.prepend(left)}
  button=head.querySelector(buttonSelector);
  if(!button){
    button=document.createElement('button');
    button.className='btn btn-ghost mobile-menu-btn';
    button.type='button';
    button.setAttribute('aria-label','Open navigation');
    button.setAttribute('aria-controls','jmbMobileMenu');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span aria-hidden="true">☰</span><span>Menu</span>';
    left.prepend(button);
  }
  button.onclick=()=>drawer.classList.contains('open')?close():open();
}
function particles(){
  if(document.getElementById('jmbParticleCanvas'))return;
  const c=document.createElement('canvas');c.id='jmbParticleCanvas';document.body.prepend(c);
  const ctx=c.getContext('2d');let w=innerWidth,h=innerHeight,dpr=1,px=-9999,py=-9999,power=0,lastMove=0;const pts=[];
  function resize(){
    w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.min(95,Math.max(32,Math.floor(w*h/17000)));
    while(pts.length<count)pts.push({x:20+Math.random()*Math.max(1,w-40),y:20+Math.random()*Math.max(1,h-40),vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.6+.55});
    pts.length=Math.min(pts.length,count);
  }
  function attract(x,y){px=Math.max(18,Math.min(w-18,x));py=Math.max(18,Math.min(h-18,y));power=1}
  addEventListener('resize',resize,{passive:true});
  addEventListener('pointerdown',e=>attract(e.clientX,e.clientY),{passive:true});
  addEventListener('touchstart',e=>{const t=e.touches[0];if(t)attract(t.clientX,t.clientY)},{passive:true});
  addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&Date.now()-lastMove>90){lastMove=Date.now();px=e.clientX;py=e.clientY;power=Math.max(power,.08)}},{passive:true});
  resize();
  function frame(){
    ctx.clearRect(0,0,w,h);
    for(const p of pts){
      if(power>0){const dx=px-p.x,dy=py-p.y,dist=Math.hypot(dx,dy)||1,force=Math.max(0,1-dist/360)*.75*power;p.vx+=dx/dist*force*.045;p.vy+=dy/dist*force*.045}
      p.vx*=.987;p.vy*=.987;p.x+=p.vx;p.y+=p.vy;
      if(p.x<8){p.x=8;p.vx=Math.abs(p.vx)*.8} if(p.x>w-8){p.x=w-8;p.vx=-Math.abs(p.vx)*.8}
      if(p.y<8){p.y=8;p.vy=Math.abs(p.vy)*.8} if(p.y>h-8){p.y=h-8;p.vy=-Math.abs(p.vy)*.8}
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(142,128,255,.72)';ctx.fill();
      if(power>0){const dx=px-p.x,dy=py-p.y,dist=Math.hypot(dx,dy);if(dist<105){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(px,py);ctx.strokeStyle='rgba(100,215,255,'+(0.1*(1-dist/105)*power)+')';ctx.stroke()}}
    }
    if(power>0){power*=.955;if(power<.02)power=0;ctx.beginPath();ctx.arc(px,py,12+20*power,0,Math.PI*2);ctx.strokeStyle='rgba(124,92,255,'+.28*power+')';ctx.stroke()}
    requestAnimationFrame(frame);
  }
  frame();
}
async function applyMaintenance(){
  if(!db||window.__jmbMaintenanceActive)return;
  try{
    if(auth){
      await auth.authStateReady?.();
      const current=auth.currentUser;
      if(current){
        const claims=(await current.getIdTokenResult()).claims||{};
        const verified=Boolean(current.emailVerified);
        if(verified&&(current.email?.toLowerCase()==='jobinmathewbiju@gmail.com'||claims.admin===true||claims.role==='admin'))return;
      }
    }
    const snap=await getDoc(doc(db,'settings','portal'));
    const m=snap.exists()?snap.data().maintenance:null;
    if(!m?.enabled)return;
    if(window.__jmbMaintenanceActive)return;
    window.__jmbMaintenanceActive=true;
    const box=document.createElement('div');
    box.className='jmb-maintenance-screen';
    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','JMB HUB maintenance');
    box.innerHTML='<div class="jmb-maintenance-card" tabindex="-1"><div class="jmb-maintenance-icon">🛠️</div><div class="eyebrow">JMBHUB MAINTENANCE</div><h1>We’ll be right back</h1><p></p><div class="jmb-maintenance-bar"><span></span></div><small>The portal is temporarily paused while maintenance is in progress.</small></div>';
    box.querySelector('p').textContent=m.message||'JMBHUB is temporarily in full maintenance mode. Please check back soon.';
    document.body.append(box);document.body.classList.add('jmb-maintenance-active');
    [...document.body.children].forEach(el=>{if(el!==box){el.inert=true;el.setAttribute('aria-hidden','true')}});
  }catch(error){console.warn('[JMBHUB] Maintenance check unavailable:',error?.code||error?.message||error)}
}
makeNav();particles();applyMaintenance();
if(auth)onAuthStateChanged(auth,u=>{if(u)initTelemetry(u)});
startGlobalCoin();

/* Remove accidental literal escaped-newline text left by old page builds. */
function cleanupEscapedNewlines(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{if(/^\\n(?:\\s*\\n)*\\s*$/.test(n.nodeValue||''))n.remove()});
}
cleanupEscapedNewlines();
