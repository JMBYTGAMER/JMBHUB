/* Shared JMBHUB portal behavior */
const links=[
  ['⌂','Dashboard','dashboard.html'],
  ['🎮','JMB Games','games.html'],
  ['🧰','JMB Area','jmb-area.html'],
  ['⛏️','Minecraft','minecraft.html'],
  ['🤖','JMB AI','ai.html'],
  ['🎫','Support','support.html'],
  ['◉','Profile','profile.html']
];
function currentPage(){return location.pathname.split('/').pop()||'index.html'}
function makeNav(){
  if(currentPage()==='index.html')return;
  let drawer=document.querySelector('.jmb-mobile-menu');
  let backdrop=document.querySelector('.jmb-drawer-backdrop');
  if(!drawer){
    backdrop=document.createElement('div');backdrop.className='jmb-drawer-backdrop';document.body.append(backdrop);
    drawer=document.createElement('aside');drawer.className='jmb-mobile-menu';drawer.setAttribute('aria-label','JMBHUB navigation');
    drawer.innerHTML='<div class="menu-title">JMBHUB • PORTAL</div>'+links.map(([i,n,u])=>'<a href="'+u+'" data-nav="'+u+'"><span class="menu-icon">'+i+'</span><span>'+n+'</span></a>').join('')+
      '<div class="menu-title" style="margin-top:22px">MANAGE</div><a href="admin.html" data-admin-only class="hide"><span class="menu-icon">⚙️</span><span>Admin Console</span></a><a href="#" data-menu-logout><span class="menu-icon">↪</span><span>Logout</span></a>';
    document.body.append(drawer);
  }
  const active=currentPage();
  const sidebar=document.querySelector('.sidebar');
  if(sidebar && !sidebar.querySelector('[data-global-account]')){
    const section=document.createElement('div');section.className='side-section';section.setAttribute('data-global-account','');
    section.innerHTML='<div class="side-label">ACCOUNT</div><a class="nav-link" href="profile.html"><span>◉</span><span>Profile</span></a><a class="nav-link" data-admin-only href="admin.html"><span>⚙️</span><span>Admin Console</span></a><a class="nav-link" href="#" data-menu-logout><span>↪</span><span>Logout</span></a>';
    sidebar.append(section);
  }
  drawer.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute('data-nav')===active)a.classList.add('active')});
  const close=()=>{drawer.classList.remove('open');backdrop.classList.remove('open');document.body.classList.remove('menu-open')};
  const open=()=>{drawer.classList.add('open');backdrop.classList.add('open');document.body.classList.add('menu-open')};
  backdrop.onclick=close;
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
  let button=head.querySelector('.mobile-menu-btn');
  if(!button){
    button=document.createElement('button');button.className='btn btn-ghost mobile-menu-btn';button.type='button';button.setAttribute('aria-label','Open navigation');button.textContent='☰';left.prepend(button);
  }
  button.onclick=open;
}
function particles(){
  if(document.getElementById('jmbParticleCanvas'))return;
  const c=document.createElement('canvas');c.id='jmbParticleCanvas';document.body.prepend(c);
  const ctx=c.getContext('2d');let w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2),px=-9999,py=-9999,power=0,lastMove=0;
  const pts=[];
  function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(105,Math.max(38,Math.floor(w*h/14500)));while(pts.length<count)pts.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.28,r:Math.random()*1.7+.6});if(pts.length>count)pts.length=count}
  function attract(x,y){px=x;py=y;power=1}
  addEventListener('resize',resize,{passive:true});
  addEventListener('pointerdown',e=>attract(e.clientX,e.clientY),{passive:true});
  addEventListener('touchstart',e=>{const t=e.touches[0];if(t)attract(t.clientX,t.clientY)},{passive:true});
  addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&Date.now()-lastMove>70){lastMove=Date.now();px=e.clientX;py=e.clientY;power=Math.max(power,.12)}},{passive:true});
  resize();
  function frame(){
    ctx.clearRect(0,0,w,h);
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      if(power>0){const dx=px-p.x,dy=py-p.y,dist=Math.hypot(dx,dy)||1,force=Math.max(0,1-dist/430)*.9*power;p.vx+=dx/dist*force*.06;p.vy+=dy/dist*force*.06}
      p.vx*=.985;p.vy*=.985;p.x+=p.vx;p.y+=p.vy;
      if(p.x<-20)p.x=w+20;if(p.x>w+20)p.x=-20;if(p.y<-20)p.y=h+20;if(p.y>h+20)p.y=-20;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(142,128,255,.78)';ctx.fill();
      if(power>0){const dx=px-p.x,dy=py-p.y,dist=Math.hypot(dx,dy);if(dist<125){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(px,py);ctx.strokeStyle='rgba(100,215,255,'+(0.12*(1-dist/125)*power)+')';ctx.stroke()}}
    }
    if(power>0){power*=.955;if(power<.02)power=0;ctx.beginPath();ctx.arc(px,py,12+20*power,0,Math.PI*2);ctx.strokeStyle='rgba(124,92,255,'+.32*power+')';ctx.stroke()}
    requestAnimationFrame(frame);
  }
  frame();
}
makeNav();particles();

/* Remove accidental literal escaped-newline text left by old page builds. */
function cleanupEscapedNewlines(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{if(/^\\n(?:\\s*\\n)*\\s*$/.test(n.nodeValue||''))n.remove()});
}
cleanupEscapedNewlines();
