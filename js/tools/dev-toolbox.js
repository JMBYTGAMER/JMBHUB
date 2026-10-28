import {guard} from '../core/auth-guard.js';
const $=s=>document.querySelector(s);
const setStatus=(id,msg,error=false)=>{const el=$('#'+id);el.textContent=msg;el.classList.toggle('error',error)};
const encodeBase64=text=>{const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary)};
const decodeBase64=value=>{const binary=atob(value.replace(/\s/g,''));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder('utf-8',{fatal:true}).decode(bytes)};
$('#jsonPretty').onclick=()=>{try{$('#jsonOutput').value=JSON.stringify(JSON.parse($('#jsonInput').value),null,2);setStatus('jsonStatus','Valid JSON formatted successfully.')}catch(e){setStatus('jsonStatus','Invalid JSON: '+e.message,true)}};
$('#jsonMinify').onclick=()=>{try{$('#jsonOutput').value=JSON.stringify(JSON.parse($('#jsonInput').value));setStatus('jsonStatus','Valid JSON minified successfully.')}catch(e){setStatus('jsonStatus','Invalid JSON: '+e.message,true)}};
$('#jsonClear').onclick=()=>{$('#jsonInput').value='';$('#jsonOutput').value='';setStatus('jsonStatus','')};
$('#baseEncode').onclick=()=>{try{$('#baseOutput').value=encodeBase64($('#baseInput').value);setStatus('baseStatus','Encoded locally. Remember: Base64 is not encryption.')}catch(e){setStatus('baseStatus',e.message||'Encoding failed.',true)}};
$('#baseDecode').onclick=()=>{try{$('#baseOutput').value=decodeBase64($('#baseInput').value);setStatus('baseStatus','Decoded locally.')}catch(e){setStatus('baseStatus','Invalid Base64 or unsupported text encoding.',true)}};
$('#baseClear').onclick=()=>{$('#baseInput').value='';$('#baseOutput').value='';setStatus('baseStatus','')};
$('#urlEncode').onclick=()=>{try{$('#urlOutput').value=encodeURIComponent($('#urlInput').value);setStatus('urlStatus','URL component encoded.')}catch(e){setStatus('urlStatus',e.message,true)}};
$('#urlDecode').onclick=()=>{try{$('#urlOutput').value=decodeURIComponent($('#urlInput').value);setStatus('urlStatus','URL component decoded.')}catch(e){setStatus('urlStatus','Invalid percent-encoded URL component.',true)}};
$('#urlClear').onclick=()=>{$('#urlInput').value='';$('#urlOutput').value='';setStatus('urlStatus','')};
$('#uuidGenerate').onclick=()=>{try{if(!crypto.randomUUID)throw new Error('This browser does not support crypto.randomUUID. Open the site over HTTPS or use a modern browser.');$('#uuidOutput').value=crypto.randomUUID();setStatus('uuidStatus','UUID v4 generated locally.')}catch(e){setStatus('uuidStatus',e.message,true)}};
$('#uuidClear').onclick=()=>{$('#uuidOutput').value='';setStatus('uuidStatus','')};
const textInput=$('#textInput');
function updateTextStats(){const value=textInput.value;$('#charCount').textContent=Array.from(value).length;$('#wordCount').textContent=(value.trim().match(/\S+/g)||[]).length;$('#lineCount').textContent=value.length?value.split(/\r\n|\r|\n/).length:0;$('#byteCount').textContent=new TextEncoder().encode(value).length}
textInput.addEventListener('input',updateTextStats);
$('#textUpper').onclick=()=>{textInput.value=textInput.value.toLocaleUpperCase();updateTextStats();setStatus('textStatus','Converted to uppercase.')};
$('#textLower').onclick=()=>{textInput.value=textInput.value.toLocaleLowerCase();updateTextStats();setStatus('textStatus','Converted to lowercase.')};
$('#textTrim').onclick=()=>{textInput.value=textInput.value.split(/\r\n|\r|\n/).map(line=>line.trim()).join('\n').trim();updateTextStats();setStatus('textStatus','Trimmed leading/trailing spaces on each line.')};
$('#textClear').onclick=()=>{textInput.value='';updateTextStats();setStatus('textStatus','')};
function convertTimestamp(multiplier){const value=$('#timestampInput').value.trim();if(!value){setStatus('timestampStatus','Enter a Unix timestamp.',true);return}const n=Number(value);if(!Number.isFinite(n)){setStatus('timestampStatus','Timestamp must be a number.',true);return}const date=new Date(n*multiplier);if(Number.isNaN(date.getTime())){setStatus('timestampStatus','Timestamp is outside the supported date range.',true);return}$('#timestampOutput').value=date.toISOString()+'\nLocal time: '+date.toLocaleString();setStatus('timestampStatus','Converted successfully.')}
$('#timestampSeconds').onclick=()=>convertTimestamp(1000);
$('#timestampMillis').onclick=()=>convertTimestamp(1);
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const el=$('#'+button.dataset.copy);if(!el)return;try{await navigator.clipboard.writeText(el.value);const card=button.closest('.dev-card');const s=card?.querySelector('.dev-status');if(s){s.textContent='Copied to clipboard.';s.classList.remove('error')}}catch{el.focus();el.select();const card=button.closest('.dev-card');const s=card?.querySelector('.dev-status');if(s){s.textContent='Clipboard permission unavailable; text selected for manual copy.';s.classList.remove('error')}}}));
updateTextStats();guard();