import {APP_CONFIG} from '../config/app-config.js';
import {guard} from '../core/auth-guard.js';
import {db,backendReady} from '../core/firebase.js';
import {doc,setDoc} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {toast} from '../core/ui.js';
const u=await guard();
const gate=document.querySelector('#ownerGate');
if(u.owner||u.admin){gate.textContent=(u.owner?'Owner':'Admin')+' access recognized.';gate.className='notice online'}else{gate.textContent='This panel is restricted to authorized staff.';gate.className='notice danger'}
const saved=JSON.parse(localStorage.getItem('jmb-service-settings')||'{}');
const base=APP_CONFIG.SERVICES;
document.querySelectorAll('.service-select').forEach(x=>{if(saved[x.dataset.key]?.enabled===false)x.value='off'});
document.querySelectorAll('.service-message').forEach(x=>{if(saved[x.dataset.key]?.message)x.value=saved[x.dataset.key].message});
async function collect(){const out={};document.querySelectorAll('.service-select').forEach(s=>{const key=s.dataset.key;out[key]={enabled:s.value==='on',message:document.querySelector(`.service-message[data-key="${key}"]`).value}});return out}
document.querySelector('#save').onclick=async()=>{if(!(u.owner||u.admin))return toast('Only authorized staff can save service settings.');const services=await collect();localStorage.setItem('jmb-service-settings',JSON.stringify(services));if(backendReady&&db){try{await setDoc(doc(db,'settings','portal'),{services,updatedBy:u.uid,updatedAt:new Date()},{merge:true});toast('Settings saved','good');return}catch(e){toast('Could not sync settings; local copy saved: '+e.message);return}}toast('Local settings saved.','good')};
