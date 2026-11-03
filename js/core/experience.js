/* Shared local-only JMB HUB micro-interactions */
(() => {
 if(window.__jmbExperienceReady)return;window.__jmbExperienceReady=true;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const progress=document.createElement('div');progress.id='jmbPageProgress';progress.setAttribute('aria-hidden','true');progress.innerHTML='<span></span>';document.body.append(progress);
 const fill=progress.firstElementChild;let ticking=false;
 const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;fill.style.width=(max>0?Math.min(100,Math.max(0,scrollY/max*100)):0)+'%';document.getElementById('jmbBackTop')?.classList.toggle('visible',scrollY>420);ticking=false};
 addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});addEventListener('resize',update,{passive:true});update();
 const selector='main section,.page > .card,.page > .grid,.page > .dashboard-hero,.page > .quick-grid,.feature-card,.service-card,.tool-card,.security-tool-card,.game-card,.workspace-card,.dashboard-panel,.call-panel,.admin-card';
 const targets=[...document.querySelectorAll(selector)].filter(el=>!el.closest('[hidden],[aria-hidden="true"],.jmb-mobile-menu')&&!el.matches('form,input,textarea,select,button'));
 if(!reduce&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('jmb-visible');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -35px 0px'});targets.forEach((el,i)=>{el.classList.add('jmb-reveal');if(i%4)el.dataset.jmbDelay=String(i%4);observer.observe(el)})}
 const back=document.createElement('button');back.id='jmbBackTop';back.type='button';back.textContent='↑';back.setAttribute('aria-label','Back to top');back.title='Back to top';back.addEventListener('click',()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'}));document.body.append(back);
})();
