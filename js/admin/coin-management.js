import {app} from '../core/firebase.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coins=v=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:8});
const call=name=>{
 if(!app)throw new Error('Firebase is not configured.');
 return httpsCallable(getFunctions(app,'asia-south1'),name);
};
function status(message,good=false){
 const el=$('coinAdminToolStatus');
 if(!el)return;
 el.textContent=message;el.classList.remove('hide');el.classList.toggle('success',good);
}
function email(){return $('coinAdminEmail')?.value.trim().toLowerCase()||''}
async function inspect(){
 const address=email(),box=$('coinAccountResult'),btn=$('inspectCoinAccount');
 if(!address.includes('@')){box.textContent='Enter the user email first.';return}
 btn.disabled=true;box.textContent='Loading wallet…';
 try{
  const r=await call('adminGetCoinAccount')({email:address});
  const a=r.data,perks=Object.entries(a.perks||{}).filter(([,v])=>v).map(([k])=>k.replaceAll('-',' '));
  const tx=(a.transactions||[]).map(t=>'<tr><td>'+esc(t.type||'transaction')+'</td><td>'+esc(t.description)+'</td><td><b class="'+(Number(t.amount)>=0?'online':'danger')+'">'+(Number(t.amount)>=0?'+':'')+esc(coins(t.amount))+'</b></td><td>'+esc(t.createdAt?new Date(t.createdAt).toLocaleString():'')+'</td></tr>').join('');
  box.innerHTML='<div><b>'+esc(a.email)+'</b><div class="muted" style="margin:5px 0">UID: '+esc(a.uid)+'</div><div class="big-number">🪙 '+esc(coins(a.balance))+'</div><p class="muted">Ad credits: '+esc(a.adCredits)+' · Perks: '+esc(perks.join(', ')||'None')+'</p><div class="table-wrap"><table class="table"><thead><tr><th>Type</th><th>Description</th><th>Change</th><th>Date</th></tr></thead><tbody>'+(tx||'<tr><td colspan="4" class="empty">No transactions yet.</td></tr>')+'</tbody></table></div></div>';
  status('Wallet loaded for '+a.email+'.',true);
 }catch(e){box.textContent=e?.message||'Could not inspect this account.';status(e?.message||'Wallet lookup failed.')}
 finally{btn.disabled=false}
}
$('inspectCoinAccount')?.addEventListener('click',inspect);
$('adjustCoinBalance')?.addEventListener('click',async()=>{
 const address=email(),amount=Number($('coinAdjustAmount')?.value),reason=$('coinAdjustReason')?.value.trim()||'Admin balance adjustment',btn=$('adjustCoinBalance');
 if(!address.includes('@'))return status('Enter the account email to adjust.');
 if(!Number.isFinite(amount)||amount===0)return status('Enter a positive or negative amount other than zero.');
 if(amount<0&&!confirm('Remove '+coins(Math.abs(amount))+' virtual JMB Coins from '+address+'? This will be recorded in the ledger.'))return;
 btn.disabled=true;
 try{
  const r=await call('adminAdjustCoins')({email:address,amount,reason});
  status('Balance updated. New balance: '+coins(r.data.balance)+' JMB Coins.',true);
  $('coinAdjustAmount').value='';await inspect();
 }catch(e){status(e?.message||'Could not adjust the wallet.')}
 finally{btn.disabled=false}
});
$('saveCoinPerk')?.addEventListener('click',async()=>{
 const address=email(),perk=$('coinAdminPerk')?.value,enabled=$('coinAdminPerkEnabled')?.value==='on',btn=$('saveCoinPerk');
 if(!address.includes('@'))return status('Enter the account email to grant or remove a perk.');
 btn.disabled=true;
 try{
  const r=await call('adminSetUserPerk')({email:address,perk,enabled});
  status((enabled?'Granted ':'Removed ')+perk+' for '+r.data.email+'. The user will see an inbox notice.',true);
  window.JMBMusic?.notify?.();await inspect();
 }catch(e){status(e?.message||'Could not update the perk.')}
 finally{btn.disabled=false}
});
