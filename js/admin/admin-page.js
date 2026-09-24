import {guard} from '../core/auth-guard.js';
import {app,db,backendReady} from '../core/firebase.js';
import {
  collection,getDocs,query,orderBy,limit,doc,updateDoc,serverTimestamp,
  arrayUnion,setDoc,getDoc
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {toast,esc} from '../core/ui.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let user;
let owner = false;
let cachedLogs = [];
let cachedServices = {};
let functionsModule = null;

function setHTML(selector, html){
  const el = $(selector);
  if(el) el.innerHTML = html;
}
function setText(selector, value){
  const el = $(selector);
  if(el) el.textContent = value;
}
function showSection(id){
  $$('.admin-section').forEach(s => s.classList.add('hide'));
  const section = $(id);
  if(section) section.classList.remove('hide');
}
function errorText(e){
  return esc(e?.message || 'Unknown error');
}

async function init(){
  user = await guard();
  owner = Boolean(user?.owner);

  if(!user?.admin){
    location.replace('dashboard.html');
    return;
  }

  const gate = $('#ownerGate');
  if(gate){
    gate.textContent = owner
      ? 'Owner access recognized — full console enabled.'
      : 'Admin access recognized — support console enabled.';
    gate.className = 'notice online';
  }

  setText('#adminRole', owner ? 'Owner' : 'Admin');
  $$('[data-owner-tab]').forEach(el => el.classList.toggle('hide', !owner));

  bindUI();
  await Promise.allSettled([
    loadTickets(),
    loadSuggestions(),
    loadServices()
  ]);
}

function bindUI(){
  $('#closeModal')?.addEventListener('click', closeModal);
  $('#adminModal')?.addEventListener('click', e => {
    if(e.target.id === 'adminModal') closeModal();
  });

  $('#refreshTickets')?.addEventListener('click', loadTickets);
  $('#refreshSuggestions')?.addEventListener('click', loadSuggestions);
  $('#refreshLogs')?.addEventListener('click', loadLogs);
  $('#refreshUsers')?.addEventListener('click', loadUsers);
  $('#replayLogs')?.addEventListener('click', replayLogs);
  $('#logFilter')?.addEventListener('change', renderLogs);
  $('#saveTelemetry')?.addEventListener('click', saveTelemetry);
  $('#save')?.addEventListener('click', saveServices);

  $$('.admin-tab').forEach(button => {
    button.addEventListener('click', async () => {
      const tab = button.dataset.tab;
      if((tab === 'services' || tab === 'security') && !owner){
        toast('Owner access required');
        return;
      }

      $$('.admin-tab').forEach(x => x.classList.remove('btn-primary'));
      $$('.admin-tab').forEach(x => x.classList.add('btn-ghost'));
      button.classList.remove('btn-ghost');
      button.classList.add('btn-primary');

      const map = {
        tickets:'#adminTickets',
        suggestions:'#adminSuggestions',
        logs:'#adminLogs',
        users:'#adminUsers',
        services:'#adminServices',
        security:'#adminSecurity'
      };
      showSection(map[tab]);

      if(tab === 'logs') await loadLogs();
      if(tab === 'users') await loadUsers();
      if(tab === 'security') await loadTelemetry();
      if(tab === 'services') await loadServices();
    });
  });
}

async function loadTickets(){
  const rows = $('#adminTicketRows');
  if(!rows) return;

  if(!backendReady || !db){
    rows.innerHTML = '<tr><td colspan="6" class="empty">Firebase is unavailable.</td></tr>';
    return;
  }

  try{
    const snap = await getDocs(
      query(collection(db,'tickets'), orderBy('createdAt','desc'), limit(100))
    );

    const openCount = snap.docs.filter(d => (d.data().status || 'open') !== 'closed').length;
    setText('#ticketCount', String(openCount));

    if(snap.empty){
      rows.innerHTML = '<tr><td colspan="6" class="empty">No tickets yet.</td></tr>';
      return;
    }

    rows.innerHTML = snap.docs.map(d => {
      const x = d.data();
      return `<tr>
        <td>${esc(d.id.slice(0,8))}</td>
        <td>${esc(x.email || x.uid || 'User')}</td>
        <td>${esc(x.subject || '')}</td>
        <td><span class="pill">${esc(x.status || 'open')}</span></td>
        <td>${x.createdAt?.toDate ? esc(x.createdAt.toDate().toLocaleString()) : '—'}</td>
        <td><button class="btn btn-ghost ticket-open" data-id="${esc(d.id)}">Open</button></td>
      </tr>`;
    }).join('');

    $$('.ticket-open').forEach(button => {
      button.addEventListener('click', () => {
        const snapDoc = snap.docs.find(d => d.id === button.dataset.id);
        if(snapDoc) openTicket(snapDoc.id, snapDoc);
      });
    });
  }catch(e){
    rows.innerHTML = `<tr><td colspan="6" class="empty">Could not load tickets: ${errorText(e)}</td></tr>`;
  }
}

function openTicket(id, snapDoc){
  const x = snapDoc.data();
  const modal = $('#adminModal');
  const body = $('#modalBody');
  if(!modal || !body) return;

  const replies = Array.isArray(x.replies) ? x.replies : [];
  body.innerHTML = `
    <div class="notice">
      <b>${esc(x.email || 'User')}</b><br>
      ${esc(x.message || '')}
    </div>
    <div style="margin-top:12px">
      <div class="eyebrow">REPLIES</div>
      ${replies.length
        ? replies.map(r => `<div class="card" style="margin-top:8px"><b>${esc(r.from || 'Admin')}</b><p class="muted">${esc(r.message || '')}</p></div>`).join('')
        : '<p class="muted">No replies yet.</p>'}
    </div>
    <div class="form-grid" style="margin-top:12px">
      <div class="field">
        <label>Status</label>
        <select id="ticketStatus">
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div class="field">
        <label>Reply</label>
        <input id="ticketReply" maxlength="1000" placeholder="Write a reply to the user">
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" id="saveTicket">Save Ticket</button>
    </div>
  `;

  setText('#modalTitle', x.subject || 'Support ticket');
  $('#ticketStatus').value = x.status || 'open';
  modal.classList.remove('hide');

  $('#saveTicket').addEventListener('click', async () => {
    const button = $('#saveTicket');
    button.disabled = true;
    try{
      const status = $('#ticketStatus').value;
      const reply = $('#ticketReply').value.trim();
      const data = {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      if(reply){
        data.replies = arrayUnion({
          from:user.email || (owner ? 'Owner' : 'Admin'),
          message:reply.slice(0,1000),
          createdAt:new Date().toISOString()
        });
      }
      await updateDoc(doc(db,'tickets',id), data);
      closeModal();
      toast('Ticket updated','good');
      await loadTickets();
    }catch(e){
      toast('Could not update ticket: ' + (e?.message || 'Unknown error'));
    }finally{
      button.disabled = false;
    }
  });
}

function closeModal(){
  $('#adminModal')?.classList.add('hide');
}

async function loadSuggestions(){
  const list = $('#suggestionRows');
  if(!list) return;

  if(!backendReady || !db){
    list.innerHTML = '<div class="notice">Firebase is unavailable.</div>';
    return;
  }

  try{
    const snap = await getDocs(
      query(collection(db,'suggestions'), orderBy('createdAt','desc'), limit(100))
    );

    if(snap.empty){
      list.innerHTML = '<div class="empty">No suggestions yet.</div>';
      return;
    }

    list.innerHTML = snap.docs.map(d => {
      const x = d.data();
      return `<article class="card" style="margin-top:10px">
        <div class="section-title">
          <div>
            <b>${esc(x.email || 'User')}</b>
            <p class="muted">${x.createdAt?.toDate ? esc(x.createdAt.toDate().toLocaleString()) : '—'}</p>
          </div>
          <span class="pill">${esc(x.status || 'new')}</span>
        </div>
        <p>${esc(x.text || '')}</p>
        ${x.status === 'reviewed'
          ? '<span class="pill">✓ Reviewed</span>'
          : `<button class="btn btn-ghost suggestion-done" data-id="${esc(d.id)}">Mark reviewed</button>`}
      </article>`;
    }).join('');

    $$('.suggestion-done').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try{
          await updateDoc(doc(db,'suggestions',button.dataset.id),{
            status:'reviewed',
            reviewedBy:user.uid,
            reviewedAt:serverTimestamp()
          });
          toast('Suggestion marked reviewed','good');
          await loadSuggestions();
        }catch(e){
          button.disabled = false;
          toast('Could not update suggestion: ' + (e?.message || 'Unknown error'));
        }
      });
    });
  }catch(e){
    list.innerHTML = `<div class="notice">Could not load suggestions: ${errorText(e)}</div>`;
  }
}

async function loadLogs(){
  if(!backendReady || !db){
    setHTML('#logRows','<tr><td colspan="6" class="empty">Firebase is unavailable.</td></tr>');
    return;
  }

  try{
    const snap = await getDocs(
      query(collection(db,'logs'), orderBy('createdAt','desc'), limit(250))
    );
    cachedLogs = snap.docs.map(d => ({id:d.id,...d.data()}));
    setText('#logCount', String(cachedLogs.length));
    renderLogs();
  }catch(e){
    setHTML('#logRows', `<tr><td colspan="6" class="empty">Could not load logs: ${errorText(e)}</td></tr>`);
  }
}

function renderLogs(){
  const filter = $('#logFilter')?.value || '';
  const rows = filter ? cachedLogs.filter(x => x.event === filter) : cachedLogs;

  setHTML('#logRows', rows.length
    ? rows.slice(0,150).map(x => `<tr>
        <td>${x.createdAt?.toDate ? esc(x.createdAt.toDate().toLocaleString()) : '—'}</td>
        <td>${esc(x.uid || '')}</td>
        <td>${esc(x.event || '')}</td>
        <td>${esc(x.page || '')}</td>
        <td>${esc(x.target || x.game || '')}</td>
        <td><span class="pill">${esc(x.mode || 'normal')}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="empty">No logs for this filter.</td></tr>');
}

function replayLogs(){
  const canvas = $('#replayCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const points = cachedLogs.filter(
    x => x.event === 'pointer_click' && Number.isFinite(x.x) && Number.isFinite(x.y)
  );

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#090d18';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.07)';

  for(let x=0;x<canvas.width;x+=45){
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();
  }
  for(let y=0;y<canvas.height;y+=45){
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();
  }

  if(!points.length){
    setText('#replayStatus','No extreme click points found. Set Extreme mode first.');
    return;
  }

  setText('#replayStatus',`Replaying ${points.length} normalized click points — visual map only.`);
  let i=0;

  const step=()=>{
    if(i>=points.length) return;
    const p=points[i++];
    const x=p.x*canvas.width;
    const y=p.y*canvas.height;

    ctx.beginPath();
    ctx.arc(x,y,9,0,Math.PI*2);
    ctx.fillStyle='rgba(124,92,255,.8)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x,y,22,0,Math.PI*2);
    ctx.strokeStyle='rgba(0,212,255,.3)';
    ctx.stroke();

    const next=points[i];
    const delay=next ? Math.max(25,Math.min(180,(next.at||p.at)-p.at||60)) : 80;
    setTimeout(step,delay);
  };
  step();
}

async function loadUsers(){
  const rows = $('#userRows');
  if(!rows) return;

  if(!owner){
    rows.innerHTML='<tr><td colspan="6" class="empty">Account management is owner-only.</td></tr>';
    return;
  }

  /* First try the secure server-side Auth directory. It needs Cloud Functions. */
  if(app){
    try{
      if(!functionsModule){
        functionsModule = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js');
      }
      const fn = functionsModule.getFunctions(app,'asia-south1');
      const call = functionsModule.httpsCallable(fn,'listUsers');
      const res = await call({});
      const users = res.data?.users || [];
      renderUsers(users);
      return;
    }catch(e){
      /* Functions are optional on Spark. Fall back to the secure Firestore profile directory. */
      console.info('[JMBHUB] Auth user list unavailable; using profile directory.',e?.message||e);
    }
  }

  try{
    const snap=await getDocs(query(collection(db,'profiles'),orderBy('lastSeenAt','desc'),limit(200)));
    const users=snap.docs.map(d=>{
      const x=d.data();
      return {
        uid:d.id,
        email:x.email||'',
        displayName:x.displayName||'',
        photoURL:x.photoURL||'',
        emailVerified:Boolean(x.emailVerified),
        lastSignInAt:x.lastSeenAt?.toDate?.()?.toISOString?.()||'',
        admin:false
      };
    });
    setText('#userCount',String(users.length));
    if(!users.length){
      rows.innerHTML='<tr><td colspan="6" class="empty">No portal profiles yet. Users appear here after they sign in.</td></tr>';
      return;
    }
    rows.innerHTML=users.map(x=>`<tr>
      <td>${esc(x.email||'—')}</td>
      <td>${esc(x.displayName||'—')}</td>
      <td>${x.emailVerified?'✓':'—'}</td>
      <td>${esc(x.lastSignInAt?new Date(x.lastSignInAt).toLocaleString():'—')}</td>
      <td><span class="pill">${x.uid===user.uid?'Owner':'Member'}</span></td>
      <td><span class="pill">Server role controls unavailable</span></td>
    </tr>`).join('');
  }catch(e){
    rows.innerHTML=`<tr><td colspan="6" class="empty">Could not load the account directory: ${errorText(e)}</td></tr>`;
    setText('#userCount','—');
  }
}

function renderUsers(users){
  const rows=$('#userRows');
  setText('#userCount',String(users.length));
  rows.innerHTML=users.length
    ? users.map(x=>`<tr>
        <td>${esc(x.email||'—')}</td>
        <td>${esc(x.displayName||'—')}</td>
        <td>${x.emailVerified?'✓':'—'}</td>
        <td>${esc(x.lastSignInAt?new Date(x.lastSignInAt).toLocaleString():'—')}</td>
        <td><span class="pill">${x.uid===user.uid?'Owner':(x.admin?'Admin':'Member')}</span></td>
        <td>${x.uid===user.uid
          ? '<span class="pill">Owner</span>'
          : `<button class="btn btn-ghost role-btn" data-uid="${esc(x.uid)}" data-role="${x.admin?'member':'admin'}">${x.admin?'Remove admin':'Make admin'}</button>`}
      </tr>`).join('')
    : '<tr><td colspan="6" class="empty">No accounts returned.</td></tr>';

  $$('.role-btn').forEach(button=>{
    button.addEventListener('click',()=>setRole(button.dataset.uid,button.dataset.role));
  });
}

async function setRole(uid,role){
  if(!owner || !app) return;
  try{
    if(!functionsModule){
      functionsModule = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js');
    }
    const fn=functionsModule.getFunctions(app,'asia-south1');
    await functionsModule.httpsCallable(fn,'setUserRole')({uid,role});
    toast('Role updated. The user must sign in again.','good');
    await loadUsers();
  }catch(e){
    toast('Could not change role: ' + (e?.message || 'Cloud Functions are not deployed.'));
  }
}

async function loadTelemetry(){
  if(!owner || !backendReady || !db) return;
  try{
    const snap=await getDoc(doc(db,'settings','telemetry'));
    const mode=snap.exists()?snap.data().mode:'normal';
    if(['low','normal','extreme'].includes(mode)) $('#telemetryMode').value=mode;
  }catch(e){
    toast('Could not load logging settings');
  }
}

async function saveTelemetry(){
  if(!owner || !db) return;
  const mode=$('#telemetryMode')?.value || 'normal';
  try{
    await setDoc(doc(db,'settings','telemetry'),{
      mode,
      updatedBy:user.uid,
      updatedAt:serverTimestamp()
    },{merge:true});
    sessionStorage.setItem('jmb-telemetry-mode',mode);
    toast('Logging mode saved','good');
  }catch(e){
    toast('Could not save logging mode: ' + (e?.message || 'Unknown error'));
  }
}

async function loadServices(){
  if(!owner || !db) return;

  try{
    const snap=await getDoc(doc(db,'settings','portal'));
    if(snap.exists() && snap.data().services){
      cachedServices=snap.data().services;
    }else{
      cachedServices={};
    }
  }catch{
    cachedServices={};
  }

  $$('.service-select').forEach(select=>{
    const item=cachedServices[select.dataset.key];
    select.value=item?.enabled === false ? 'off' : 'on';
  });

  $$('.service-message').forEach(input=>{
    const item=cachedServices[input.dataset.key];
    if(item?.message) input.value=item.message;
  });
}

async function saveServices(){
  if(!owner || !db) return;

  const services={};
  $$('.service-select').forEach(select=>{
    const key=select.dataset.key;
    const input=document.querySelector(`.service-message[data-key="${key}"]`);
    services[key]={
      enabled:select.value==='on',
      message:(input?.value || '').trim().slice(0,180)
    };
  });

  try{
    await setDoc(doc(db,'settings','portal'),{
      services,
      updatedBy:user.uid,
      updatedAt:serverTimestamp()
    },{merge:true});

    localStorage.setItem('jmb-service-settings',JSON.stringify(services));
    cachedServices=services;
    toast('Service settings saved','good');
  }catch(e){
    toast('Could not save service settings: ' + (e?.message || 'Unknown error'));
  }
}

init().catch(e=>{
  console.error('[JMBHUB admin]',e);
  const gate=$('#ownerGate');
  if(gate){
    gate.textContent='Admin console failed to initialize: ' + (e?.message || 'Unknown error');
    gate.className='notice danger';
  }
});
