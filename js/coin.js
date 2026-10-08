import {auth,db} from './core/firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const money=n=>Number(n||0).toFixed(8).replace(/0+$/,'').replace(/\.$/,'')||'0';
let unsub=null;

function mount(u){
  if(!db||!u||document.getElementById('jmbGlobalCoin'))return;
  const el=document.createElement('a');
  el.id='jmbGlobalCoin';
  el.className='jmb-global-coin';
  el.href='coins.html';
  el.setAttribute('aria-label','Open JMB Coin wallet');
  el.innerHTML='<span class="jmb-global-coin-icon">🪙</span><span id="jmbGlobalCoinBalance">0</span><span class="jmb-global-coin-label">JMB</span>';
  document.body.append(el);
  const balance=document.getElementById('jmbGlobalCoinBalance');
  unsub=onSnapshot(doc(db,'wallets',u.uid),snap=>{
    balance.textContent=money(snap.exists()?snap.data().balance:0);
  },()=>{balance.textContent='—'});
}
export function startGlobalCoin(){
  if(!auth)return;
  onAuthStateChanged(auth,u=>{
    unsub?.();unsub=null;
    document.getElementById('jmbGlobalCoin')?.remove();
    if(u)mount(u);
  });
}
