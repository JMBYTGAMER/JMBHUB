let active=null;
let movedStage=null;
let originalParent=null;
let originalNext=null;
let originalShell=null;

function createOverlay(){
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
  return overlay;
}

function restore(){
  if(!movedStage||!originalParent)return;
  if(originalNext&&originalNext.parentNode===originalParent)originalParent.insertBefore(movedStage,originalNext);
  else originalParent.appendChild(movedStage);
  originalShell?.classList.remove('jmb-workspace-placeholder');
  movedStage=null;originalParent=null;originalNext=null;originalShell=null;
}

function close(){
  if(!active)return;
  active.classList.remove('open');
  document.body.classList.remove('jmb-window-open');
  active._onClose?.();
  restore();
  active.remove();
  active=null;
}

export function openWorkspace(stage,{title='Workspace',description='',onClose}={}){
  close();
  movedStage=stage;
  originalParent=stage.parentNode;
  originalNext=stage.nextSibling;
  originalShell=originalParent?.closest?.('.game-panel,.tool-workspace,.mc-workspace');
  originalShell?.classList.add('jmb-workspace-placeholder');

  const overlay=createOverlay();
  const body=overlay.querySelector('.jmb-workspace-body');
  body.append(stage);
  overlay.querySelector('#jmbWorkspaceTitle').textContent=title;
  overlay.querySelector('#jmbWorkspaceDesc').textContent=description||'Use the workspace below, then close it to return to JMBHUB.';
  overlay._onClose=onClose;
  overlay._close=close;
  overlay.querySelectorAll('[data-window-close]').forEach(x=>x.addEventListener('click',close));
  active=overlay;
  requestAnimationFrame(()=>overlay.querySelector('.jmb-workspace-close')?.focus());
  return overlay;
}

export function closeWorkspace(){close()}

addEventListener('keydown',e=>{
  if(e.key==='Escape'&&active?.classList.contains('open')){e.preventDefault();close();}
});