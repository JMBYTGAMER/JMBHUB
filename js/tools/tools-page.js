import {guard} from '../core/auth-guard.js';
import {toast} from '../core/ui.js';
import {openWorkspace} from '../core/workspace-window.js';
const library=document.querySelector('#toolLibrary'),stage=document.querySelector('#toolStage');
let activeToolCleanup=null;
const tools=[
 ['calc','🧮','Calculator','Fast expression calculator.'],
 ['qr','🔳','QR Generator','Create a QR code from text or a URL.'],
 ['scan','📷','QR Scanner','Scan a QR with your camera when supported.'],
 ['code','💻','Code Tester','Run your own HTML/CSS/JS in a sandbox.'],
 ['counter','🔤','Text Counter','Count characters, words and lines.'],
 ['json','{}','JSON Formatter','Format and validate JSON.'],
 ['convert','🔄','Unit Converter','Convert common length, weight and temperature units.'],
 ['color','🎨','Color Converter','Convert HEX, RGB and preview colors.'],
 ['uuid','🆔','UUID Maker','Generate random IDs locally.'],
 ['timer','⏱️','Timer','Simple countdown timer.'],
 ['stopwatch','⏲️','Stopwatch','Track time with start, pause and reset.'],
 ['game','🕹️','Mini Game Maker','Generate a tiny downloadable HTML game.'],
 ['base64','🔐','Base64','Encode or decode text locally.'],
 ['encrypt','🛡️','AES Text Vault','Encrypt and decrypt text locally using AES-GCM and a password.'],
 ['fileencrypt','🔐','File Encryptor','Encrypt files in your browser and download a JMB file package.'],
 ['strength','🔑','Password Strength','Check password length and common strength signals locally.'],
 ['hash','#️⃣','Hash Maker','Create a SHA-256 hash in your browser.'],
 ['filehash','📂','File Checksum','Generate SHA-256 and SHA-512 checksums locally for a file.'],
 ['markdown','📝','Markdown Preview','Preview basic Markdown-style text.'],
 ['timestamp','🕒','Timestamp','Convert dates and Unix timestamps.'],
 ['password','🔑','Password Generator','Create a random strong password locally.'],
 ['regex','🧩','Regex Tester','Test a regular expression against text.'],
 ['gradient','🌈','Gradient Maker','Build a CSS linear gradient.'],
 ['csv','📊','CSV Viewer','Paste CSV and view it as a table.'],
 ['url','🔗','URL Encoder','Encode or decode URLs safely in your browser.'],
 ['jwt','🪪','JWT Inspector','Decode JWT headers and payloads locally.'],
 ['diff','📝','Text Diff','Compare two text blocks and find changes.'],
 ['baseconv','🔢','Number Base','Convert decimal, binary, octal and hex.'],
 ['colorpick','🎯','Color Picker','Pick a color and copy its HEX/RGB values.'],
 ['aspect','🖼️','Aspect Ratio','Calculate image and video dimensions.'],
 ['lorem','📄','Lorem Generator','Generate placeholder text locally.'],
 ['ip','🌐','IP Helper','Show browser-visible network information without storing it.']
];
function render(){library.innerHTML=tools.map(([id,i,n,d])=>`<button class="tool-choice" data-tool="${id}"><div class="tool-art">${i}</div><h3>${n}</h3><p>${d}</p><span class="pill">Open →</span></button>`).join('');library.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>openTool(b.dataset.tool))}
function head(t){const x=tools.find(a=>a[0]===t);document.querySelector('#toolTitle').textContent=x[2];document.querySelector('#toolDesc').textContent=x[3];library.querySelectorAll('.tool-choice').forEach(b=>b.classList.toggle('active',b.dataset.tool===t))}
const panel=x=>{stage.innerHTML='<div class="tool-panel">'+x+'</div>'};
function openTool(name){activeToolCleanup?.();activeToolCleanup=null;head(name);const info=tools.find(x=>x[0]===name)||tools[0];const renderers={calc,qr,scan,code,counter,json,convert,color,uuid,timer,stopwatch,game,base64,encrypt,fileencrypt,strength,hash,filehash,markdown,timestamp,password,regex,gradient,csv,url,jwt,diff,baseconv,colorpick,aspect,lorem,ip};renderers[name]();openWorkspace(stage,{title:info[2],description:info[3],onClose:()=>{activeToolCleanup?.();activeToolCleanup=null}})}
function evaluateMath(source){
 const s=String(source).replace(/\s+/g,'');
 const tokens=s.match(/(?:\d+(?:\.\d*)?|\.\d+|[()+\-*/%])/g)||[];
 if(!s||tokens.join('')!==s)throw new Error('Invalid characters');
 let pos=0;
 const expression=()=>{let n=term();while(tokens[pos]==='+'||tokens[pos]==='-'){const op=tokens[pos++],r=term();n=op==='+'?n+r:n-r}return n};
 const term=()=>{let n=factor();while(tokens[pos]==='*'||tokens[pos]==='/'||tokens[pos]==='%'){const op=tokens[pos++],r=factor();if((op==='/'||op==='%')&&r===0)throw new Error('Division by zero');n=op==='*'?n*r:op==='/'?n/r:n%r}return n};
 const factor=()=>{const t=tokens[pos];if(t==='+'||t==='-'){pos++;const n=factor();return t==='-'?-n:n}if(t==='('){pos++;const n=expression();if(tokens[pos++]!==')')throw new Error('Missing )');return n}if(t===undefined||! /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t))throw new Error('Expected number');pos++;return Number(t)};
 const value=expression();if(pos!==tokens.length||!Number.isFinite(value))throw new Error('Invalid result');return value;
}
function calc(){panel('<input id="calcInput" class="tool-input" inputmode="decimal" placeholder="Example: (25*4)/2+10"><div id="calcResult" class="result-box">0</div><div class="tool-actions"><button class="btn btn-primary" id="calcBtn">Calculate</button><button class="btn btn-ghost" id="calcClear">Clear</button></div><p class="muted">Supports +, −, ×, ÷, %, decimals and parentheses. No code is executed.</p>');const run=()=>{const v=$('#calcInput').value.trim();if(!v)return;try{$('#calcResult').textContent=String(evaluateMath(v))}catch{$('#calcResult').textContent='Invalid expression'}};$('#calcBtn').onclick=run;$('#calcInput').addEventListener('keydown',e=>{if(e.key==='Enter')run()});$('#calcClear').onclick=()=>{$('#calcInput').value='';$('#calcResult').textContent='0'}}
function loadQRCodeLibrary(){
 if(window.QRCode)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let script=document.querySelector('script[data-jmb-qrcode]');
  if(script){if(script.dataset.loaded==='true'&&window.QRCode){resolve();return}}
  else{script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';script.dataset.jmbQrcode='1';script.async=true;document.head.append(script)}
  script.addEventListener('load',()=>{script.dataset.loaded='true';window.QRCode?resolve():reject(new Error('QR library failed to initialize'))},{once:true});
  script.addEventListener('error',()=>reject(new Error('QR library could not load. Check your internet connection.')),{once:true});
 });
}
function qr(){
 panel('<p class="muted">Generate a real, scannable QR code from text or a URL. Your input stays in this page.</p><input id="qrText" class="tool-input" maxlength="2000" placeholder="https://example.com"><div id="qrHolder" class="qr-box" style="min-height:250px"></div><div class="tool-actions"><button class="btn btn-primary" id="qrBtn">Generate QR</button><button class="btn btn-ghost" id="qrDownload" disabled>Download PNG</button></div><p id="qrStatus" class="muted" role="status"></p>');
 const holder=$('#qrHolder'),status=$('#qrStatus'),download=$('#qrDownload');
 $('#qrBtn').onclick=async()=>{
  const value=$('#qrText').value.trim();if(!value){status.textContent='Enter some text or a URL first.';return}
  status.textContent='Generating…';download.disabled=true;holder.replaceChildren();
  try{await loadQRCodeLibrary();new window.QRCode(holder,{text:value,width:240,height:240,colorDark:'#111326',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});status.textContent='QR code ready. Scan it to verify the contents.';download.disabled=false}
  catch(e){status.textContent=e.message||'Could not create QR code.'}
 };
 download.onclick=()=>{
  const canvas=holder.querySelector('canvas'),img=holder.querySelector('img'),url=canvas?.toDataURL('image/png')||img?.src;
  if(!url){status.textContent='Generate a QR code before downloading.';return}
  const a=document.createElement('a');a.href=url;a.download='jmbhub-qr.png';a.click();
 };
}
function scan(){
 panel('<p class="muted">Camera permission is requested only after you tap Start. Scanning happens in your browser.</p><video id="qrVideo" class="tool-video" playsinline></video><div id="scanResult" class="result-box">Camera off</div><button class="btn btn-primary" id="scanBtn">Start Scanner</button>');
 const v=$('#qrVideo'),out=$('#scanResult'),button=$('#scanBtn');
 let stream=null,raf=0,running=false;
 const stop=()=>{
  running=false;if(raf)cancelAnimationFrame(raf);raf=0;
  stream?.getTracks?.().forEach(t=>t.stop());stream=null;
  if(v.srcObject)v.srcObject=null;
  button.disabled=false;
 };
 activeToolCleanup=stop;
 button.onclick=async()=>{
  button.disabled=true;out.textContent='Requesting camera…';
  try{
   if(!('BarcodeDetector'in window))throw new Error('This browser does not support the built-in QR detector. Try a newer browser.');
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access requires HTTPS and a supported browser.');
   running=true;stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
   if(!running){stream.getTracks().forEach(t=>t.stop());stream=null;return}
   v.srcObject=stream;await v.play();
   const detector=new BarcodeDetector({formats:['qr_code']});
   button.textContent='Scanning…';
   const loop=async()=>{
    if(!running||!v.srcObject)return;
    try{
     const codes=await detector.detect(v);
     if(codes[0]){out.textContent=codes[0].rawValue;stop();button.textContent='Start Scanner';return}
    }catch{}
    if(running)raf=requestAnimationFrame(loop);
   };
   loop();
  }catch(e){out.textContent=e.message||'Camera could not start.';stop();button.textContent='Start Scanner'}
 };
}
function code(){panel('<textarea id="codeInput" class="tool-area" placeholder="<h1>Hello JMB</h1>"></textarea><iframe id="codeFrame" class="code-frame" sandbox="allow-scripts"></iframe><button class="btn btn-primary" id="codeRun">Run Code</button>');document.querySelector('#codeRun').onclick=()=>{document.querySelector('#codeFrame').srcdoc=document.querySelector('#codeInput').value}}
function counter(){panel('<textarea id="countText" class="tool-area" placeholder="Type or paste text here..."></textarea><div class="grid grid-3"><div class="result-box"><span>Characters: <b id="chars">0</b></span></div><div class="result-box"><span>Words: <b id="words">0</b></span></div><div class="result-box"><span>Lines: <b id="lines">0</b></span></div></div>');document.querySelector('#countText').oninput=e=>{const t=e.target.value;document.querySelector('#chars').textContent=t.length;document.querySelector('#words').textContent=t.trim()?t.trim().split(/\s+/).length:0;document.querySelector('#lines').textContent=t? t.split(/\n/).length:0}}
function json(){panel('<textarea id="jsonInput" class="tool-area" placeholder="{&quot;name&quot;:&quot;JMB&quot;}"></textarea><textarea id="jsonOutput" class="tool-area" readonly placeholder="Formatted JSON"></textarea><button class="btn btn-primary" id="jsonBtn">Format JSON</button>');document.querySelector('#jsonBtn').onclick=()=>{try{document.querySelector('#jsonOutput').value=JSON.stringify(JSON.parse(document.querySelector('#jsonInput').value),null,2)}catch{document.querySelector('#jsonOutput').value='Invalid JSON'}}}
function convert(){panel('<div class="form-grid"><div class="field"><label>Value</label><input id="cv" type="number" value="1"></div><div class="field"><label>Type</label><select id="ct"><option value="kmmi">Kilometres → Miles</option><option value="mikm">Miles → Kilometres</option><option value="kg">Kilograms → Pounds</option><option value="lb">Pounds → Kilograms</option><option value="cf">Celsius → Fahrenheit</option><option value="fc">Fahrenheit → Celsius</option></select></div></div><div id="cvout" class="result-box">1</div><button class="btn btn-primary" id="cvbtn">Convert</button>');document.querySelector('#cvbtn').onclick=()=>{const v=Number(document.querySelector('#cv').value),t=document.querySelector('#ct').value,m={kmmi:v=>v*.621371,mikm:v=>v*1.609344,kg:v=>v*2.20462,lb:v=>v*.453592,cf:v=>v*9/5+32,fc:v=>(v-32)*5/9};document.querySelector('#cvout').textContent=m[t](v).toFixed(4).replace(/\.0+$/,'')}}
function color(){panel('<div class="form-grid"><div class="field"><label>HEX</label><input id="hex" class="tool-input" value="#7c5cff"></div><div class="field"><label>RGB</label><input id="rgb" class="tool-input" readonly></div></div><div id="colorPreview" class="result-box" style="height:130px;justify-content:center">Color preview</div><button class="btn btn-primary" id="colorBtn">Convert</button>');document.querySelector('#colorBtn').onclick=()=>{const h=document.querySelector('#hex').value.trim().replace('#','');if(!/^[0-9a-fA-F]{6}$/.test(h))return;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);document.querySelector('#rgb').value=`rgb(${r}, ${g}, ${b})`;document.querySelector('#colorPreview').style.background='#'+h}}
function uuid(){panel('<div id="uuidOut" class="result-box">Click generate.</div><button class="btn btn-primary" id="uuidBtn">Generate UUID</button><button class="btn btn-ghost" id="uuidCopy">Copy</button>');const out=document.querySelector('#uuidOut');document.querySelector('#uuidBtn').onclick=()=>out.textContent=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);document.querySelector('#uuidCopy').onclick=()=>navigator.clipboard?.writeText(out.textContent)}
function timer(){
 panel('<div class="timer-display" id="timerDisplay">05:00</div><div class="form-grid"><div class="field"><label>Minutes</label><input id="tm" type="number" min="0" max="999" value="5"></div><div class="field"><label>Seconds</label><input id="ts" type="number" min="0" max="59" value="0"></div></div><div class="tool-actions"><button class="btn btn-primary" id="timerStart">Start</button><button class="btn btn-ghost" id="timerReset">Reset</button></div>');
 let iv=null,remain=300;
 const readInput=()=>Math.max(0,Math.min(999,Math.floor(Number($('#tm').value)||0)))*60+Math.max(0,Math.min(59,Math.floor(Number($('#ts').value)||0)));
 const display=()=>{const el=$('#timerDisplay');if(el)el.textContent=String(Math.floor(remain/60)).padStart(2,'0')+':'+String(remain%60).padStart(2,'0')};
 const stop=()=>{clearInterval(iv);iv=null};
 activeToolCleanup=stop;display();
 $('#timerStart').onclick=()=>{
  if(iv){stop();$('#timerStart').textContent='Resume';return}
  if(remain<=0)remain=readInput();
  if(remain<=0){toast('Set a timer longer than zero.');return}
  $('#timerStart').textContent='Pause';
  iv=setInterval(()=>{remain=Math.max(0,remain-1);display();if(!remain){stop();$('#timerStart').textContent='Start again';toast('Timer finished','good');window.JMBMusic?.notify?.()}},1000);
 };
 $('#timerReset').onclick=()=>{stop();remain=readInput();display();$('#timerStart').textContent='Start'};
}
function stopwatch(){
 panel('<div class="timer-display" id="sw">00:00.00</div><div class="tool-actions"><button class="btn btn-primary" id="swStart">Start</button><button class="btn btn-ghost" id="swReset">Reset</button></div>');
 let iv=null,start=0,elapsed=0;const out=$('#sw'),button=$('#swStart');
 const draw=()=>{const ms=elapsed+(start?Date.now()-start:0),sec=Math.floor(ms/1000),hund=Math.floor(ms%1000/10);out.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')+'.'+String(hund).padStart(2,'0')};
 const pause=()=>{clearInterval(iv);iv=null;if(start){elapsed+=Date.now()-start;start=0}button.textContent=elapsed?'Resume':'Start';draw()};
 activeToolCleanup=()=>{clearInterval(iv);iv=null;start=0};
 button.onclick=()=>{if(start){pause();return}start=Date.now();button.textContent='Pause';clearInterval(iv);iv=setInterval(draw,30)};
 $('#swReset').onclick=()=>{clearInterval(iv);iv=null;start=0;elapsed=0;button.textContent='Start';draw()};
 draw();
}
function game(){panel('<input id="gameName" class="tool-input" placeholder="My JMB Game"><textarea id="gameDesc" class="tool-area" placeholder="Tap the button to score points."></textarea><div class="tool-actions"><button class="btn btn-primary" id="makeGame">Generate</button><a id="downloadGame" class="btn btn-ghost hide" download="jmb-game.html">Download HTML</a></div>');document.querySelector('#makeGame').onclick=()=>{const n=(document.querySelector('#gameName').value||'JMB Mini Game').replace(/</g,'');const d=(document.querySelector('#gameDesc').value||'Tap to score.').replace(/</g,'');const html='<!doctype html><html><body style="font-family:system-ui;text-align:center;padding:40px"><h1>'+n+'</h1><p>'+d+'</p><button onclick="this.textContent=\'Score: \'+(Number(this.dataset.s||0)+1);this.dataset.s=Number(this.dataset.s||0)+1">Tap!</button></body></html>';const a=document.querySelector('#downloadGame');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.classList.remove('hide')}}


function strength(){
 panel('<div class="field"><label>Password to check (processed locally)</label><input id="strengthIn" class="tool-input" type="password" autocomplete="off" placeholder="Type a password to evaluate"><label style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="strengthShow" type="checkbox"> Show password</label></div><div class="result-box" id="strengthScore">Enter a password to check it.</div><ul id="strengthHints" class="muted"></ul>');
 $('#strengthShow').onchange=()=>$('#strengthIn').type=$('#strengthShow').checked?'text':'password';
 $('#strengthIn').oninput=()=>{const p=$('#strengthIn').value;let score=0;const tests=[p.length>=12,p.length>=16,/[a-z]/.test(p),/[A-Z]/.test(p),/[0-9]/.test(p),/[^A-Za-z0-9]/.test(p)];score=tests.filter(Boolean).length;const label=!p?'Enter a password':score<=2?'Weak':score<=4?'Fair':'Strong';$('#strengthScore').textContent=label+' · '+score+'/6 checks';$('#strengthHints').innerHTML=['Use 12–16+ characters','Mix uppercase and lowercase letters','Include numbers and symbols','Avoid names, common phrases, and reused passwords'].map(x=>'<li>'+x+'</li>').join('')};
}


function encrypt(){
 panel('<p class="muted">AES-GCM encryption with a PBKDF2-derived key. Text is processed locally; it is not uploaded. Keep your passphrase safe—there is no recovery if you lose it.</p><div class="field"><label for="cryptoPass">Passphrase</label><input id="cryptoPass" class="tool-input" type="password" autocomplete="new-password" maxlength="512" placeholder="Use a long, unique passphrase"></div><div class="field"><label for="cryptoInput">Text to encrypt or encrypted JMB text</label><textarea id="cryptoInput" class="tool-area" maxlength="200000" placeholder="Enter your message here, or paste a JMBENC1 value to decrypt."></textarea></div><div class="tool-actions"><button class="btn btn-primary" id="cryptoEncrypt">Encrypt text</button><button class="btn btn-ghost" id="cryptoDecrypt">Decrypt text</button><button class="btn btn-ghost" id="cryptoCopy">Copy output</button></div><div class="field"><label for="cryptoOutput">Output</label><textarea id="cryptoOutput" class="tool-area" readonly placeholder="Encrypted or decrypted result appears here."></textarea></div><p id="cryptoStatus" class="notice" role="status">Encrypted output starts with JMBENC1:. All encryption happens in this browser.</p>');
 const status=$('#cryptoStatus'),input=$('#cryptoInput'),output=$('#cryptoOutput'),pass=$('#cryptoPass');
 const setStatus=(m,ok=false)=>{status.textContent=m;status.classList.toggle('success',ok)};
 const bytesToB64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)};
 const b64ToBytes=s=>{const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0))};
 const derive=async(password,salt)=>{
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 };
 $('#cryptoEncrypt').onclick=async()=>{
  const password=pass.value,text=input.value;if(!password){setStatus('Enter a passphrase first.');return}if(!text){setStatus('Enter text to encrypt first.');return}
  const btn=$('#cryptoEncrypt');btn.disabled=true;setStatus('Encrypting locally…');
  try{
   if(!crypto.subtle)throw new Error('Web Crypto is unavailable. Open JMBHUB over HTTPS in a supported browser.');
   const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(password,salt);
   const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text)));
   const packed=new Uint8Array(salt.length+iv.length+cipher.length);packed.set(salt,0);packed.set(iv,salt.length);packed.set(cipher,salt.length+iv.length);
   output.value='JMBENC1:'+bytesToB64(packed);setStatus('Encrypted successfully. Save the output and remember your passphrase.',true);window.JMBMusic?.win?.();
  }catch(e){setStatus(e.message||'Encryption failed.')}
  finally{btn.disabled=false}
 };
 $('#cryptoDecrypt').onclick=async()=>{
  const password=pass.value,value=input.value.trim();if(!password){setStatus('Enter the original passphrase first.');return}
  if(!value.startsWith('JMBENC1:')){setStatus('This does not look like JMBENC1 encrypted text.');return}
  const btn=$('#cryptoDecrypt');btn.disabled=true;setStatus('Decrypting locally…');
  try{
   if(!crypto.subtle)throw new Error('Web Crypto is unavailable. Open JMBHUB over HTTPS in a supported browser.');
   const packed=b64ToBytes(value.slice(8));if(packed.length<45)throw new Error('Encrypted data is incomplete.');
   const salt=packed.slice(0,16),iv=packed.slice(16,28),cipher=packed.slice(28),key=await derive(password,salt);
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);output.value=new TextDecoder().decode(plain);setStatus('Decrypted successfully. The passphrase matched.',true);window.JMBMusic?.notify?.();
  }catch(e){output.value='';setStatus(e.name==='OperationError'?'Decryption failed. Check the passphrase or encrypted text.':(e.message||'Decryption failed.'))}
  finally{btn.disabled=false}
 };
 $('#cryptoCopy').onclick=async()=>{try{await navigator.clipboard.writeText(output.value);setStatus('Output copied to clipboard.',true)}catch{output.focus();output.select();setStatus('Clipboard access was blocked; select and copy the output manually.')}};
}

function base64(){panel('<div class="field"><label>Text</label><textarea id="b64in" class="tool-area"></textarea></div><div class="tool-actions"><button class="btn btn-primary" id="b64e">Encode</button><button class="btn btn-ghost" id="b64d">Decode</button></div><textarea id="b64out" class="tool-area" readonly></textarea>');const out=$('#b64out');$('#b64e').onclick=()=>out.value=btoa(unescape(encodeURIComponent($('#b64in').value)));$('#b64d').onclick=()=>{try{out.value=decodeURIComponent(escape(atob($('#b64in').value)))}catch{out.value='Invalid Base64'}}}
async function hash(){panel('<textarea id="hashIn" class="tool-area" placeholder="Text to hash"></textarea><button class="btn btn-primary" id="hashBtn">SHA-256</button><div id="hashOut" class="result-box">—</div>');$('#hashBtn').onclick=async()=>{const data=new TextEncoder().encode($('#hashIn').value),buf=await crypto.subtle.digest('SHA-256',data);$('#hashOut').textContent=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')}}
async function fileencrypt(){
 panel('<p class="muted">AES-256-GCM file encryption runs locally in your browser. Password-derived keys use PBKDF2-SHA-256. Files up to 50 MB are supported; nothing is uploaded. Keep the password safe.</p><div class="field"><label for="feFile">Choose a file to encrypt, or a .jmbenc file to decrypt</label><input id="feFile" class="tool-input" type="file"></div><div class="field"><label for="fePass">Password (at least 12 characters recommended)</label><input id="fePass" class="tool-input" type="password" autocomplete="new-password" maxlength="512"></div><div class="tool-actions"><button id="feEncrypt" type="button" class="btn btn-primary">🔒 Encrypt & download</button><button id="feDecrypt" type="button" class="btn btn-ghost">🔓 Decrypt & download</button></div><div id="feStatus" class="notice" role="status">Choose a file to begin.</div>');
 const fileInput=$('#feFile'),password=$('#fePass'),status=$('#feStatus'),encBtn=$('#feEncrypt'),decBtn=$('#feDecrypt');
 const encoder=new TextEncoder(),decoder=new TextDecoder(),magic=encoder.encode('JMBFILE1');
 const derive=async(pass,salt)=>{const material=await crypto.subtle.importKey('raw',encoder.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])};
 const save=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)};
 const busy=value=>{encBtn.disabled=value;decBtn.disabled=value;fileInput.disabled=value};
 encBtn.onclick=async()=>{
  const file=fileInput.files?.[0],pass=password.value;
  if(!file){status.textContent='Choose a file first.';return}
  if(!pass||pass.length<8){status.textContent='Use a password with at least 8 characters (12 or more is recommended).';return}
  if(file.size>50*1024*1024){status.textContent='Files larger than 50 MB are not supported by this browser tool.';return}
  if(!globalThis.crypto?.subtle){status.textContent='Web Crypto is unavailable. Open JMBHUB over HTTPS in a supported browser.';return}
  const name=encoder.encode(file.name.slice(0,200)),mime=encoder.encode((file.type||'application/octet-stream').slice(0,200));
  if(name.length>65535||mime.length>65535){status.textContent='File metadata is too long.';return}
  busy(true);status.textContent='Encrypting locally…';
  try{
   const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(pass,salt),plain=await file.arrayBuffer();
   const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain));
   const header=new Uint8Array(40+name.length+mime.length),view=new DataView(header.buffer);header.set(magic,0);view.setUint16(8,name.length);view.setUint16(10,mime.length);header.set(salt,12);header.set(iv,28);header.set(name,40);header.set(mime,40+name.length);
   save(new Blob([header,cipher],{type:'application/octet-stream'}),file.name+'.jmbenc');status.textContent='Encrypted file downloaded. Keep the password and encrypted file together in a safe place.';window.JMBMusic?.win?.();
  }catch(e){status.textContent=e.message||'File encryption failed.'}
  finally{busy(false)}
 };
 decBtn.onclick=async()=>{
  const file=fileInput.files?.[0],pass=password.value;
  if(!file){status.textContent='Choose a .jmbenc file first.';return}
  if(!pass){status.textContent='Enter the original password.';return}
  if(file.size>51*1024*1024){status.textContent='This file is too large for the browser tool.';return}
  if(!globalThis.crypto?.subtle){status.textContent='Web Crypto is unavailable. Open JMBHUB over HTTPS in a supported browser.';return}
  busy(true);status.textContent='Decrypting locally…';
  try{
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(bytes.length<56||decoder.decode(bytes.slice(0,8))!=='JMBFILE1')throw new Error('This file is not a supported JMBFILE1 package.');
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),nameLength=view.getUint16(8),mimeLength=view.getUint16(10),nameStart=40,mimeStart=nameStart+nameLength,cipherStart=mimeStart+mimeLength;
   if(cipherStart>=bytes.length)throw new Error('Encrypted file appears incomplete.');
   const name=decoder.decode(bytes.slice(nameStart,mimeStart)).replace(/[\\/\\0]/g,'_').slice(0,200)||'decrypted-file.bin',mime=decoder.decode(bytes.slice(mimeStart,cipherStart)).slice(0,200)||'application/octet-stream',salt=bytes.slice(12,28),iv=bytes.slice(28,40),cipher=bytes.slice(cipherStart),key=await derive(pass,salt);
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);save(new Blob([plain],{type:mime}),name);status.textContent='Decrypted file downloaded.';window.JMBMusic?.notify?.();
  }catch(e){status.textContent=e.name==='OperationError'?'Decryption failed. Check the password or file integrity.':(e.message||'File decryption failed.')}
  finally{busy(false)}
 };
}
function filehash(){
 panel('<p class="muted">Create file fingerprints in your browser. Your file is not uploaded. SHA-256 and SHA-512 are integrity hashes, not encryption.</p><div class="field"><label for="fhFile">Choose a file (max 50 MB)</label><input id="fhFile" class="tool-input" type="file"></div><div id="fhStatus" class="notice" role="status">Select a file to calculate its checksums.</div><div class="field"><label>SHA-256</label><textarea id="fh256" class="tool-area" readonly></textarea><button id="fhCopy256" class="btn btn-ghost" type="button">Copy SHA-256</button></div><div class="field"><label>SHA-512</label><textarea id="fh512" class="tool-area" readonly></textarea><button id="fhCopy512" class="btn btn-ghost" type="button">Copy SHA-512</button></div>');
 const file=$('#fhFile'),status=$('#fhStatus'),out256=$('#fh256'),out512=$('#fh512');
 const hex=buf=>Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
 const copy=async value=>{try{await navigator.clipboard.writeText(value);status.textContent='Checksum copied to clipboard.'}catch{status.textContent='Clipboard unavailable. Select and copy the checksum manually.'}};
 $('#fhCopy256').onclick=()=>copy(out256.value);$('#fhCopy512').onclick=()=>copy(out512.value);
 file.onchange=async()=>{
  out256.value='';out512.value='';const selected=file.files?.[0];if(!selected){status.textContent='Select a file to calculate its checksums.';return}
  if(selected.size>50*1024*1024){file.value='';status.textContent='This tool supports files up to 50 MB.';return}
  if(!globalThis.crypto?.subtle){status.textContent='Web Crypto is unavailable. Open JMBHUB over HTTPS in a supported browser.';return}
  status.textContent='Calculating checksums locally…';file.disabled=true;
  try{const bytes=await selected.arrayBuffer();const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',bytes),crypto.subtle.digest('SHA-512',bytes)]);out256.value=hex(a);out512.value=hex(b);status.textContent=selected.name+' ('+selected.size.toLocaleString()+' bytes) verified locally.';window.JMBMusic?.win?.()}
  catch{status.textContent='Could not calculate the checksums for this file.'}
  finally{file.disabled=false}
 };
}

function markdown(){panel('<textarea id="mdIn" class="tool-area" placeholder="# Hello JMB"></textarea><div id="mdOut" class="result-box" style="display:block;min-height:180px"></div>');$('#mdIn').oninput=()=>{let s=$('#mdIn').value.replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]));s=s.replace(/^### (.*)$/gm,'<h4>$1</h4>').replace(/^## (.*)$/gm,'<h3>$1</h3>').replace(/^# (.*)$/gm,'<h2>$1</h2>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\*(.*?)\*/g,'<i>$1</i>').replace(/\n/g,'<br>');$('#mdOut').innerHTML=s}}
function timestamp(){panel('<div class="form-grid"><div class="field"><label>Date/time</label><input id="dateIn" type="datetime-local"></div><div class="field"><label>Unix seconds</label><input id="unixIn" type="number"></div></div><div id="timeOut" class="result-box">—</div><div class="tool-actions"><button class="btn btn-primary" id="timeNow">Convert</button><button class="btn btn-ghost" id="timeCurrent">Now</button></div>');$('#timeNow').onclick=()=>{if($('#dateIn').value){const d=new Date($('#dateIn').value);$('#timeOut').textContent='Unix: '+Math.floor(d.getTime()/1000)}else if($('#unixIn').value){$('#timeOut').textContent=new Date(Number($('#unixIn').value)*1000).toString()}};$('#timeCurrent').onclick=()=>{$('#dateIn').value=new Date().toISOString().slice(0,16);$('#timeNow').click()}}
function password(){panel('<div class="form-grid"><div class="field"><label>Length</label><input id="pwLen" type="number" min="8" max="64" value="16"></div><div class="field"><label>Result</label><input id="pwOut" class="tool-input" readonly></div></div><button class="btn btn-primary" id="pwBtn">Generate</button><button class="btn btn-ghost" id="pwCopy">Copy</button>');const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';$('#pwBtn').onclick=()=>{const length=Math.max(8,Math.min(64,Math.floor(Number($('#pwLen').value)||16)));$('#pwLen').value=length;let x='';const a=new Uint32Array(length);crypto.getRandomValues(a);for(let i=0;i<a.length;i++)x+=chars[a[i]%chars.length];$('#pwOut').value=x};$('#pwCopy').onclick=()=>navigator.clipboard?.writeText($('#pwOut').value)}
function regex(){panel('<input id="rx" class="tool-input" placeholder="Regular expression, e.g. ^JMB"><textarea id="rxText" class="tool-area" placeholder="Text to test"></textarea><div id="rxOut" class="result-box">—</div><button class="btn btn-primary" id="rxBtn">Test</button>');$('#rxBtn').onclick=()=>{try{const re=new RegExp($('#rx').value);const m=$('#rxText').value.match(re);$('#rxOut').textContent=m?'Match found: '+m[0]:'No match'}catch(e){$('#rxOut').textContent='Invalid regex'}}}
function gradient(){panel('<div class="form-grid"><div class="field"><label>Start</label><input id="g1" value="#7c5cff"></div><div class="field"><label>End</label><input id="g2" value="#00c6ea"></div></div><div id="gradOut" class="result-box" style="height:150px"></div><div class="tool-actions"><button class="btn btn-primary" id="gradBtn">Build</button><button class="btn btn-ghost" id="gradCopy">Copy CSS</button></div>');const draw=()=>{const v='linear-gradient(135deg,'+$('#g1').value+','+$('#g2').value+')';$('#gradOut').style.background=v;$('#gradOut').dataset.css='background:'+v+';'};$('#gradBtn').onclick=draw;$('#gradCopy').onclick=()=>navigator.clipboard?.writeText($('#gradOut').dataset.css||'');draw()}
function csv(){panel('<textarea id="csvIn" class="tool-area" placeholder="name,score\nJMB,100"></textarea><div class="table-wrap"><table class="table"><tbody id="csvOut"></tbody></table></div><button class="btn btn-primary" id="csvBtn">Render CSV</button>');$('#csvBtn').onclick=()=>{const rows=$('#csvIn').value.trim().split(/\n/).map(x=>x.split(','));$('#csvOut').innerHTML=rows.map((row,i)=>'<tr>'+row.map(v=>'<'+(i===0?'th':'td')+'>'+v.replace(/[<>]/g,'')+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('')}}
 
function url(){panel('<textarea id="urlIn" class="tool-area" placeholder="Text or URL"></textarea><div class="tool-actions"><button class="btn btn-primary" id="urlE">Encode</button><button class="btn btn-ghost" id="urlD">Decode</button></div><div id="urlOut" class="result-box"></div>');$('#urlE').onclick=()=>$('#urlOut').textContent=encodeURIComponent($('#urlIn').value);$('#urlD').onclick=()=>{try{$('#urlOut').textContent=decodeURIComponent($('#urlIn').value)}catch{$('#urlOut').textContent='Invalid encoded URL'}}}
function jwt(){panel('<textarea id="jwtIn" class="tool-area" placeholder="Paste a JWT"></textarea><div id="jwtOut" class="result-box"></div><button class="btn btn-primary" id="jwtBtn">Decode</button>');$('#jwtBtn').onclick=()=>{try{const [h,p]=($('#jwtIn').value||'').split('.');const dec=x=>JSON.parse(decodeURIComponent(escape(atob(x.replace(/-/g,'+').replace(/_/g,'/')))));$('#jwtOut').textContent=JSON.stringify({header:dec(h),payload:dec(p)},null,2)}catch{$('#jwtOut').textContent='Invalid JWT'}}}
function diff(){panel('<div class="form-grid"><textarea id="diffA" class="tool-area" placeholder="Original text"></textarea><textarea id="diffB" class="tool-area" placeholder="New text"></textarea></div><div id="diffOut" class="result-box"></div><button class="btn btn-primary" id="diffBtn">Compare</button>');$('#diffBtn').onclick=()=>{const a=$('#diffA').value.split(/\n/),b=$('#diffB').value.split(/\n/);let out=[];Math.max(a.length,b.length);for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i])out.push('Line '+(i+1)+': '+(a[i]===undefined?'− '+b[i]:'~ '+(b[i]??'')));$('#diffOut').textContent=out.join('\n')||'No differences'}} 
function baseconv(){panel('<div class="form-grid"><div class="field"><label>Number</label><input id="bcIn" class="tool-input" value="255"></div><div class="field"><label>Base</label><select id="bcBase"><option>10</option><option>2</option><option>8</option><option>16</option></select></div></div><div id="bcOut" class="result-box"></div><button class="btn btn-primary" id="bcBtn">Convert</button>');$('#bcBtn').onclick=()=>{const n=parseInt($('#bcIn').value,Number($('#bcBase').value));$('#bcOut').textContent=Number.isFinite(n)?'Decimal: '+n+' | Binary: '+n.toString(2)+' | Octal: '+n.toString(8)+' | Hex: '+n.toString(16).toUpperCase():'Invalid number'}} 
function colorpick(){panel('<input id="cp" type="color" value="#7c5cff" style="width:100%;height:90px"><div id="cpOut" class="result-box"></div>');const draw=()=>{const h=$('#cp').value,n=parseInt(h.slice(1),16);$('#cpOut').textContent=h+' • RGB('+((n>>16)&255)+', '+((n>>8)&255)+', '+(n&255)+')'};$('#cp').oninput=draw;draw()}
function aspect(){panel('<div class="form-grid"><input id="aw" class="tool-input" type="number" placeholder="Width"><input id="ah" class="tool-input" type="number" placeholder="Height"></div><div id="arOut" class="result-box"></div><button class="btn btn-primary" id="arBtn">Calculate</button>');$('#arBtn').onclick=()=>{const w=Number($('#aw').value),h=Number($('#ah').value);const g=(a,b)=>b?g(b,a%b):a;const d=g(w,h);$('#arOut').textContent=d?'Ratio: '+(w/d)+':'+(h/d):'Enter dimensions'}} 
function lorem(){panel('<div class="form-grid"><input id="lp" class="tool-input" type="number" min="1" max="20" value="3"><button class="btn btn-primary" id="lg">Generate</button></div><textarea id="lo" class="tool-area" readonly></textarea>');const words='JMB HUB creates useful games tools Minecraft utilities community features and simple experiences for everyone'.split(' ');$('#lg').onclick=()=>{$('#lo').value=Array.from({length:Number($('#lp').value)||3},(_,i)=>Array.from({length:25},(_,j)=>words[(i*25+j)%words.length]).join(' ')).join('\n\n')}}
function ip(){panel('<div class="notice">This tool intentionally shows only browser-visible connection data. It does not save or send your IP.</div><div id="ipOut" class="result-box">Checking…</div>');$('#ipOut').textContent='Browser: '+navigator.userAgent+' | Online: '+navigator.onLine}
await guard();render();
