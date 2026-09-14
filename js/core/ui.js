export const $=(s,p=document)=>p.querySelector(s); export const $$=(s,p=document)=>[...p.querySelectorAll(s)];
export function toast(message,type=''){const wrap=$('#toastWrap')||(()=>{const x=document.createElement('div');x.id='toastWrap';x.className='toast-wrap';document.body.append(x);return x})();const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=message;wrap.append(t);setTimeout(()=>t.remove(),3300)}
export function setText(id,value){const el=typeof id==='string'?$('#'+id):id;if(el)el.textContent=value}
export function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
