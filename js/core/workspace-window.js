let active=null;
let previousParent=null;
let previousNext=null;

function ensure(stage){
  if(active) return active;
  const overlay=document.createElement('div');
  overlay.className='jmb-workspace-overlay';
  overlay.innerHTML=`
    <div class="jmb-workspace-backdrop" data-window-close></div>
    <section class="jmb-workspace-window" role="dialog" aria-modal="true" aria-labelledby="jmbWorkspaceTitle">
      <header class="jmb-workspace-head">
        <div class="jmb-workspace-heading">
          <span class="jmb-window-badge">JMBHUB</span>
          <div><h2 id="jmbWorkspaceTitle">Workspace</h2><p id="jmbWorkspaceDesc"></p></div>
        </div>
        <button class="jmb-workspace-close" type="button" aria-label="Close workspace" data-window-close>×</button>
      </header>
      <div class="jmb-workspace-body"></div>
    </section>`;
  document.body.append(overlay);

  const body=overlay.querySelector('.jmb-workspace-body');
  previousParent=stage.parentNode;
  previousNext=stage.nextSibling;
  body.append(stage);

  const originalShell=previousParent?.closest?.('.game-panel,.tool-workspace,.mc-workspace');
  if(originalShell) originalShell.classList.add('jmb-workspace-placeholder');

  const close=()=>{
    overlay.classList.remove('open');
    document.body.classList.remove('jmb-window-open');
    active=null;
  };
  overlay.querySelectorAll('[data-window-close]').forEach(x=>x.addEventListener('click',close));
  overlay._close=close;
  active=overlay;
  return overlay;
}

export function openWorkspace(stage,{title='Workspace',description='',onClose}={}){
  const overlay=ensure(stage);
  overlay.querySelector('#jmbWorkspaceTitle').textContent=title;
  overlay.querySelector('#jmbWorkspaceDesc').textContent=description||'Use the workspace below, then close it to return to JMBHUB.';
  overlay.classList.add('open');
  document.body.classList.add('jmb-window-open');
  requestAnimationFrame(()=>overlay.querySelector('.jmb-workspace-close')?.focus());
  if(onClose) overlay._onClose=onClose;
  return overlay;
}

export function closeWorkspace(){
  active?._close?.();
}

addEventListener('keydown',e=>{
  if(e.key==='Escape'&&active?.classList.contains('open')) active._close?.();
});
