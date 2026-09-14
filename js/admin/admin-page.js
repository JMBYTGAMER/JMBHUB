import {APP_CONFIG} from '../config/app-config.js';
import {requireStaff} from '../core/auth-guard.js';
import {db,backendReady,functions} from '../core/firebase.js';
import {doc,setDoc} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';
import {toast} from '../core/ui.js';
const u=await requireStaff();
const gate=document.querySelector('#ownerGate'),badge=document.querySelector('#roleBadge');
gate.textContent=`Access granted • ${u.owner?'Owner':'Admin'} account`;badge.textContent=u.owner?'OWNER':'ADMIN';
if(u.owner)document.querySelector('#roleManager')?.classList.remove('hide');
const saved=JSON.parse(localStorage.getItem('jmb-service-settings')||'{}');
Object.keys(saved).forEach(k=>{const s=document.querySelector(`.service-select[data-key="${k}"]`),m=document.querySelector(`.service-message[data-key="${k}"]`);if(saved[k]?.enabled===false&&s)s.value='off';if(saved[k]?.message&&m)m.value=saved[k].message});
async function collect(){const out={};document.querySelectorAll('.service-select').forEach(s=>{const key=s.dataset.key,m=document.querySelector(`.service-message[data-key="${key}"]`);out[key]={enabled:s.value==='on',message:String(m?.value||'').slice(0,160)}});return out}
document.querySelector('#save').onclick=async()=>{const services=await collect();localStorage.setItem('jmb-service-settings',JSON.stringify(services));if(backendReady&&db){try{await setDoc(doc(db,'settings','portal'),{services,updatedBy:u.uid,updatedAt:new Date()},{merge:true});toast('Settings published','good');return}catch{toast('Could not publish settings right now.');return}}toast('Settings saved locally.','good')};
async function setRole(email,admin){if(!u.owner)return toast('Only the owner can manage staff.');email=String(email||'').trim().toLowerCase();if(!email)return toast('Enter an account email.');if(!functions)return toast('Staff service is unavailable right now.');try{await httpsCallable(functions,'setAdminRole')({email,admin});toast(admin?'Admin role granted.':'Admin role removed.','good')}catch(e){toast(e?.message?.replace('FirebaseError: ','')||'Could not update that role.')}}
document.querySelector('#grantAdmin')?.addEventListener('click',()=>setRole(document.querySelector('#staffEmail').value,true));document.querySelector('#removeAdmin')?.addEventListener('click',()=>setRole(document.querySelector('#staffEmail').value,false));
