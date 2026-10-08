import {auth,db} from '../core/firebase.js';
import {doc,getDoc,runTransaction,collection,query,where,getDocs,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const button=document.getElementById('giveCoins');
if(button){
 document.addEventListener('click',async e=>{
  if(e.target!==button)return;
  e.preventDefault();e.stopImmediatePropagation();
  const email=document.getElementById('coinTargetEmail')?.value.trim().toLowerCase();
  const amount=Number(document.getElementById('coinGrantAmount')?.value);
  const reason=(document.getElementById('coinGrantReason')?.value||'Admin reward').trim().slice(0,180)||'Admin reward';
  const status=document.getElementById('coinGrantStatus');
  if(!auth.currentUser){toast('Please sign in again.');return}
  if(!email||!email.includes('@')){toast('Enter the user account email.');return}
  if(!Number.isFinite(amount)||amount<=0){toast('Enter a positive coin amount.');return}
  button.disabled=true;
  try{
   const snap=await getDocs(query(collection(db,'profiles'),where('email','==',email),limit(2)));
   if(snap.empty)throw new Error('No JMBHUB profile found for that email. Ask the user to sign in once.');
   const target=snap.docs[0].data();
   const uid=target.uid||snap.docs[0].id;
   const wallet=doc(db,'wallets',uid);
   const tx=doc(collection(db,'coinTransactions'));
   const next=await runTransaction(db,async t=>{
    const ws=await t.get(wallet);
    const balance=Number(ws.exists()?ws.data().balance||0:0);
    const nextBalance=Number((balance+amount).toFixed(8));
    t.set(wallet,{uid,balance:nextBalance,updatedAt:serverTimestamp()},{merge:true});
    t.set(tx,{uid,amount,type:'admin_grant',description:reason,adminUid:auth.currentUser.uid,adminEmail:auth.currentUser.email||'',createdAt:serverTimestamp()});
    return nextBalance;
   });
   if(status){status.textContent=`Added ${amount} coins. New balance: ${next}.`;status.classList.remove('hide')}
   toast('JMB Coins granted successfully','good');
   document.getElementById('coinGrantAmount').value='';
  }catch(e){toast('Could not give coins: '+(e?.message||'Unknown error'))}
  finally{button.disabled=false}
 },true);
}