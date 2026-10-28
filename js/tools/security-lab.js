import {guard} from '../core/auth-guard.js';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const $ = (s) => document.querySelector(s);
const status = (id, message, error=false) => { const el=$('#'+id); if(el){el.textContent=message;el.classList.toggle('error',Boolean(error));} };
const bytesToBase64 = (bytes) => { let binary=''; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length))); return btoa(binary); };
const base64ToBytes = (text) => { const binary=atob(String(text).replace(/\s/g,'')); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i); return bytes; };
const toHex = (bytes) => Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const fromPem = (text) => { const body=text.replace(/-----BEGIN [^-]+-----/g,'').replace(/-----END [^-]+-----/g,'').replace(/\s/g,'');return base64ToBytes(body); };
const toPem = (label,bytes) => { const b64=bytesToBase64(new Uint8Array(bytes)); const lines=b64.match(/.{1,64}/g)||[]; return '-----BEGIN '+label+'-----\n'+lines.join('\n')+'\n-----END '+label+'-----'; };
function bytesToBigRandomIndex(max){ if(max<1)throw new Error('Invalid random range'); const limit=Math.floor(256/max)*max; const buffer=new Uint8Array(1); let value; do{crypto.getRandomValues(buffer);value=buffer[0]}while(value>=limit);return value%max; }
function randomFromCharset(length,charset){ if(!charset)throw new Error('Choose at least one character type.'); let out=''; while(out.length<length)out+=charset[bytesToBigRandomIndex(charset.length)]; return out.slice(0,length); }
async function deriveAesKey(passphrase,salt,iterations){const material=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
function bytesToText(bytes){return decoder.decode(bytes)}
function setupAes(){
 $('#aesEncrypt').addEventListener('click',async()=>{try{
  if(!crypto?.subtle)throw new Error('This browser does not support Web Crypto. Open the site on HTTPS.');
  const plain=$('#aesText').value,pass=$('#aesPass').value;if(!plain)throw new Error('Enter text to encrypt.');if(pass.length<10)throw new Error('Use a passphrase at least 10 characters long.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),iterations=210000,key=await deriveAesKey(pass,salt,iterations);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(plain));
  const pack={format:'JMBHUB-AES-GCM',version:1,kdf:'PBKDF2-SHA-256',iterations:iterations,salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(new Uint8Array(encrypted))};
  $('#aesOutput').value=JSON.stringify(pack,null,2);status('aesStatus','Encrypted locally. Save the package and keep your passphrase private.');
 }catch(e){status('aesStatus',e.message||'Encryption failed.',true)}});
 $('#aesDecrypt').addEventListener('click',async()=>{try{
  if(!crypto?.subtle)throw new Error('This browser does not support Web Crypto. Open the site on HTTPS.');
  const raw=$('#aesText').value,pass=$('#aesPass').value;if(!raw||!pass)throw new Error('Paste the encrypted package and enter its passphrase.');
  const pack=JSON.parse(raw);if(pack.format!=='JMBHUB-AES-GCM'||pack.version!==1||pack.kdf!=='PBKDF2-SHA-256')throw new Error('Unsupported or invalid encrypted package.');
  const iterations=Number(pack.iterations);if(!Number.isInteger(iterations)||iterations<100000||iterations>1000000)throw new Error('Invalid key-derivation settings.');
  const salt=base64ToBytes(pack.salt),iv=base64ToBytes(pack.iv),cipher=base64ToBytes(pack.ciphertext);if(salt.length!==16||iv.length!==12||cipher.length<16)throw new Error('The encrypted package is incomplete or damaged.');
  const key=await deriveAesKey(pass,salt,iterations);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
  $('#aesOutput').value=bytesToText(new Uint8Array(plain));status('aesStatus','Decrypted successfully in this browser.');
 }catch(e){status('aesStatus',e instanceof SyntaxError?'The package is not valid JSON.':(e.name==='OperationError'?'Decryption failed. Check the passphrase or the package.':e.message||'Decryption failed.'),true)}});
 $('#aesClear').addEventListener('click',()=>{$('#aesText').value='';$('#aesPass').value='';$('#aesOutput').value='';status('aesStatus','')});
}
function setupHash(){
 $('#hashRun').addEventListener('click',async()=>{try{let data;if($('#hashFile').files[0])data=await $('#hashFile').files[0].arrayBuffer();else{const t=$('#hashText').value;if(!t)throw new Error('Enter text or select a file.');data=encoder.encode(t)}
   const outputs=[['sha256Out','SHA-256'],['sha384Out','SHA-384'],['sha512Out','SHA-512']];
  for(const [id,alg] of outputs)$('#'+id).value=toHex(new Uint8Array(await crypto.subtle.digest(alg,data)));
  status('hashStatus','Calculated locally for '+($('#hashFile').files[0]?.name||'text input')+'.');
 }catch(e){status('hashStatus',e.message||'Could not calculate hashes.',true)}});
 $('#hashClear').addEventListener('click',()=>{$('#hashText').value='';$('#hashFile').value='';['sha256Out','sha384Out','sha512Out'].forEach(id=>$('#'+id).value='');status('hashStatus','')});
}
function setupHmac(){
 $('#hmacSign').addEventListener('click',async()=>{try{const msg=$('#hmacMessage').value,keyText=$('#hmacKey').value;if(!msg)throw new Error('Enter a message.');if(!keyText)throw new Error('Enter a secret key.');const key=await crypto.subtle.importKey('raw',encoder.encode(keyText),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(msg));$('#hmacSignature').value=bytesToBase64(new Uint8Array(sig));status('hmacStatus','Signature created locally. Keep the secret key private.')}catch(e){status('hmacStatus',e.message||'Signing failed.',true)}});
 $('#hmacVerify').addEventListener('click',async()=>{try{const msg=$('#hmacMessage').value,keyText=$('#hmacKey').value,sigText=$('#hmacSignature').value;if(!msg||!keyText||!sigText)throw new Error('Enter the message, secret key and signature.');const key=await crypto.subtle.importKey('raw',encoder.encode(keyText),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);const valid=await crypto.subtle.verify('HMAC',key,base64ToBytes(sigText),encoder.encode(msg));status('hmacStatus',valid?'✓ Signature is valid for this message and key.':'✕ Signature does not match this message and key.',!valid)}catch(e){status('hmacStatus',e.message||'Verification failed.',true)}});
 $('#hmacClear').addEventListener('click',()=>{$('#hmacMessage').value='';$('#hmacKey').value='';$('#hmacSignature').value='';status('hmacStatus','')});
}
function setupRandom(){
 $('#randomGenerate').addEventListener('click',()=>{try{const bytes=crypto.getRandomValues(new Uint8Array(Number($('#randomBits').value)));$('#randomHex').value=toHex(bytes);$('#randomBase64').value=bytesToBase64(bytes);status('randomStatus','Generated '+bytes.length+' cryptographically random bytes.')}catch(e){status('randomStatus',e.message||'Generation failed.',true)}});
 $('#randomClear').addEventListener('click',()=>{$('#randomHex').value='';$('#randomBase64').value='';status('randomStatus','')});
}
function setupRsa(){
 $('#rsaGenerate').addEventListener('click',async()=>{try{if(!crypto?.subtle)throw new Error('Web Crypto is not available. Use HTTPS.');status('rsaStatus','Generating a 2048-bit RSA key pair…');const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);const pub=await crypto.subtle.exportKey('spki',pair.publicKey),priv=await crypto.subtle.exportKey('pkcs8',pair.privateKey);$('#rsaPublic').value=toPem('PUBLIC KEY',pub);$('#rsaPrivate').value=toPem('PRIVATE KEY',priv);status('rsaStatus','Key pair generated locally. Protect the private key and download it only to a trusted device.')}catch(e){status('rsaStatus',e.message||'Key generation failed.',true)}});
 $('#rsaClear').addEventListener('click',()=>{$('#rsaPublic').value='';$('#rsaPrivate').value='';status('rsaStatus','Keys cleared from the page.')});
 $('#rsaDownload').addEventListener('click',()=>{const value=$('#rsaPrivate').value;if(!value){status('rsaStatus','Generate a key pair first.',true);return}const url=URL.createObjectURL(new Blob([value+'\n'],{type:'application/x-pem-file'}));const a=document.createElement('a');a.href=url;a.download='jmbhub-private-key.pem';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('rsaStatus','Download requested. Store the private key securely.')});
}
function setupPassword(){
 $('#passwordGenerate').addEventListener('click',()=>{try{const length=Number($('#passwordLength').value);if(!Number.isInteger(length)||length<12||length>128)throw new Error('Choose a length between 12 and 128.');let sets='';if($('#pwLower').checked)sets+='abcdefghijklmnopqrstuvwxyz';if($('#pwUpper').checked)sets+='ABCDEFGHIJKLMNOPQRSTUVWXYZ';if($('#pwDigits').checked)sets+='0123456789';if($('#pwSymbols').checked)sets+='!#$%&()*+,-./:;=?@[]^_{|}~';if(!sets)throw new Error('Choose at least one character group.');let out='';if($('#pwLower').checked)out+=randomFromCharset(1,'abcdefghijklmnopqrstuvwxyz');if($('#pwUpper').checked)out+=randomFromCharset(1,'ABCDEFGHIJKLMNOPQRSTUVWXYZ');if($('#pwDigits').checked)out+=randomFromCharset(1,'0123456789');if($('#pwSymbols').checked)out+=randomFromCharset(1,'!#$%&()*+,-./:;=?@[]^_{|}~');out+=randomFromCharset(length-out.length,sets);const chars=Array.from(out);for(let i=chars.length-1;i>0;i--){const j=bytesToBigRandomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}$('#passwordOutput').value=chars.join('');status('passwordStatus','Generated '+length+' characters locally.')}catch(e){status('passwordStatus',e.message||'Generation failed.',true)}});
 $('#passwordClear').addEventListener('click',()=>{$('#passwordOutput').value='';status('passwordStatus','')});
}
const labels={aes:['Password Encryption','Encrypt text with a passphrase; keep that passphrase safe.'],hash:['Hash & File Checksum','Create SHA-2 fingerprints to verify files or compare content.'],hmac:['HMAC Sign & Verify','Create a keyed signature or verify one locally.'],random:['Secure Random Generator','Generate cryptographically random bytes in your browser.'],rsa:['RSA Key Pair','Generate an RSA-OAEP public/private key pair locally.'],password:['Password Generator','Generate a strong random password using browser cryptography.']};
function initTabs(){document.querySelectorAll('[data-security-tool]').forEach(button=>button.addEventListener('click',()=>{const name=button.dataset.securityTool;document.querySelectorAll('[data-security-tool]').forEach(b=>b.classList.toggle('active',b===button));document.querySelectorAll('[data-security-panel]').forEach(p=>p.hidden=p.dataset.securityPanel!==name);$('#securityTitle').textContent=labels[name][0];$('#securityDescription').textContent=labels[name][1]}))}
async function copyOutput(id){const el=$('#'+id);if(!el)return;try{await navigator.clipboard.writeText(el.value);const prev=el.value;statusForCopy('Copied to clipboard.')}catch{el.focus();el.select();statusForCopy('Select and copy the highlighted text manually.')}function statusForCopy(message){const panel=el.closest('[data-security-panel]');const s=panel?.querySelector('.security-status');if(s){s.textContent=message;s.classList.remove('error')}}}
document.querySelectorAll('.copy-output').forEach(b=>b.addEventListener('click',()=>copyOutput(b.dataset.copy)));
if(!window.isSecureContext)document.querySelectorAll('.security-status').forEach(s=>{s.textContent='Tip: Web Crypto requires a secure context (HTTPS or localhost).'});
initTabs();setupAes();setupHash();setupHmac();setupRandom();setupRsa();setupPassword();guard();