import {guard,logout} from '../core/auth-guard.js';
const u=await guard();
document.querySelector('#profileName').textContent=u.displayName||'JMB User';
document.querySelector('#profileEmail').textContent=u.email||'';
document.querySelector('#logout').onclick=logout;
