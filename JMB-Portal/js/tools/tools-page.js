import {guard} from '../core/auth-guard.js';
import {db,storage,firebaseEnabled} from '../core/firebase.js';
import {collection,addDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {ref as storageRef,uploadBytes,getDownloadURL} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import {toast,esc} from '../core/ui.js';

const $=s=>document.querySelector(s);
const user=await guard();

function safeCalc(expr){
  if(!/^[0-9+\-*/().%\s]+$/.test(expr)) throw Error('Only numbers and + - * / % ( ) are allowed.');
  const v=Function(`"use strict";return (${expr})`)();
  if(!Number.isFinite(v)) throw Error('Invalid result');
  return v;
}
$('#calcBtn').onclick=()=>{try{$('#calcResult').textContent=safeCalc($('#calcInput').value)}catch(e){$('#calcResult').textContent=e.message}};

let QR;
try{QR=(await import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm')).default}catch{}
$('#qrBtn').onclick=()=>{
  const text=$('#qrText').value.trim();
  if(!text)return toast('Enter text or a URL');
  const canvas=$('#qrCanvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=200;
  if(!QR){toast('QR engine could not load. Check your internet connection.');return}
  const qr=QR(0,'M');qr.addData(text);qr.make();const count=qr.getModuleCount(),cell=200/count;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,200,200);ctx.fillStyle='#000';
  for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c))ctx.fillRect(Math.round(c*cell),Math.round(r*cell),Math.ceil(cell),Math.ceil(cell));
  toast('QR generated','good')
};

let scanStream;
$('#scanBtn').onclick=async()=>{
  if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;$('#qrVideo').srcObject=null;$('#scanBtn').textContent='Start Scanner';$('#scanResult').textContent='Camera off';return}
  if(!('BarcodeDetector'in window)){toast('QR scanning needs a browser that supports BarcodeDetector.');return}
  try{
    const detector=new BarcodeDetector({formats:['qr_code']});
    scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
    const v=$('#qrVideo');v.srcObject=scanStream;await v.play();$('#scanBtn').textContent='Stop Scanner';$('#scanResult').textContent='Scanning…';
    const tick=async()=>{
      if(!scanStream)return;
      try{const codes=await detector.detect(v);if(codes[0]){$('#scanResult').textContent=codes[0].rawValue;scanStream.getTracks().forEach(t=>t.stop());scanStream=null;v.srcObject=null;$('#scanBtn').textContent='Start Scanner';return}}catch{}
      requestAnimationFrame(tick)
    };tick();
  }catch(e){toast('Camera error: '+e.message)}
};

$('#codeRun').onclick=()=>{$('#codeFrame').srcdoc=$('#codeInput').value};

$('#makeGame').onclick=()=>{
  const name=($('#gameName').value||'JMB Game').replace(/[<>]/g,''),desc=($('#gameDesc').value||'Click the target.').replace(/[<>]/g,'');
  const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070912;color:#fff;font:18px system-ui}button{padding:18px 24px;border:0;border-radius:14px;font-weight:800}#s{font-size:50px}</style><div><h1>${name}</h1><p>${desc}</p><button id="b">CLICK</button><div id="s">0</div></div><script>let s=0;document.getElementById('b').onclick=()=>document.getElementById('s').textContent=++s;<\/script>`;
  const a=$('#downloadGame');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.classList.remove('hide');a.textContent='Download '+name;
};

const files=$('#filePick'),list=$('#fileList');
files.onchange=()=>{
  list.innerHTML=[...files.files].map((f,i)=>`<div class="file-row"><div><b>${esc(f.name)}</b><small>${Math.round(f.size/1024)} KB</small></div><div class="file-actions"><a download="${esc(f.name)}" href="${URL.createObjectURL(f)}">Local</a><button class="upload-file" data-i="${i}">Share</button></div></div>`).join('');
  list.querySelectorAll('.upload-file').forEach(btn=>btn.onclick=()=>shareFile(Number(btn.dataset.i)));
};
async function shareFile(index){
  const file=files.files[index];
  if(!file)return;
  if(!firebaseEnabled||user.demo||!storage||!db){toast('Configure Firebase first to share files online.');return}
  try{
    const path=`users/${user.uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const snap=await uploadBytes(storageRef(storage,path),file,{contentType:file.type||'application/octet-stream'});
    const url=await getDownloadURL(snap.ref);
    await addDoc(collection(db,'fileShares'),{uid:user.uid,email:user.email||'',name:file.name,size:file.size,type:file.type||'',path,url,createdAt:serverTimestamp()});
    await navigator.clipboard.writeText(url).catch(()=>{});
    toast('Share link created and copied','good');
  }catch(e){toast('File sharing failed: '+e.message)}
}
