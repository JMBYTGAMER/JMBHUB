import {guard} from '../core/auth-guard.js';
const $=s=>document.querySelector(s);
const stage=$('#arcadeStage');
const meta={
 reaction:['Quick Reaction','Wait for GO, then tap as quickly as you can.'],
 memory:['Memory Matrix','Watch the lit tiles, then repeat the full sequence.'],
 tiles:['Tile Sprint','Tap the highlighted tile as many times as possible in 15 seconds.'],
 dodge:['Lane Dodge','Move left and right to avoid the falling blocks for 30 seconds.']
};
let cleanup=()=>{};
function stop(){try{cleanup()}catch{}cleanup=()=>{}}
function setHeader(name){$('#arcadeTitle').textContent=meta[name][0];$('#arcadeDesc').textContent=meta[name][1];document.querySelectorAll('[data-arcade]').forEach(b=>b.classList.toggle('active',b.dataset.arcade===name));const key='jmbhub-arcade-best-'+name;const best=localStorage.getItem(key);$('#arcadeRecord').textContent='Best: '+(best||'—')}
function saveBest(name,value,lowerIsBetter=false){const key='jmbhub-arcade-best-'+name,old=Number(localStorage.getItem(key));if(!old||(lowerIsBetter?value<old:value>old))localStorage.setItem(key,String(value));$('#arcadeRecord').textContent='Best: '+localStorage.getItem(key)}
function btn(label,id,cls='btn btn-primary'){return '<button id="'+id+'" class="'+cls+'">'+label+'</button>'}
function reaction(){
 stage.innerHTML='<div class="arcade-center"><p class="muted">Press start, wait for the green signal, then tap GO. Tapping early resets the round.</p><div id="reactionDisplay" class="arcade-big">READY?</div><div class="arcade-controls">'+btn('Start round','reactionStart')+btn('GO!','reactionGo','btn btn-ghost arcade-control')+'</div><div id="reactionMessage" class="arcade-message" role="status">Your best reaction time appears above.</div></div>';
 const display=$('#reactionDisplay'),message=$('#reactionMessage'),go=$('#reactionGo');let timeout=null,armedAt=0,armed=false,done=false;go.disabled=true;
 const clear=()=>{if(timeout)clearTimeout(timeout);timeout=null};
 $('#reactionStart').onclick=()=>{clear();armed=false;done=false;go.disabled=true;display.textContent='WAIT…';message.textContent='Stay ready. Do not tap yet.';timeout=setTimeout(()=>{armed=true;armedAt=performance.now();display.textContent='GO!';display.style.color='#35e6a2';go.disabled=false},900+Math.random()*2300)};
 go.onclick=()=>{if(done)return;if(!armed){clear();display.textContent='TOO SOON';display.style.color='#ff7b95';message.textContent='You tapped before GO. Start another round.';go.disabled=true;done=true;return}const elapsed=Math.round(performance.now()-armedAt);done=true;armed=false;go.disabled=true;display.textContent=elapsed+' ms';display.style.color='';message.textContent='Nice reaction! Try to beat your best.';saveBest('reaction',elapsed,true)};
 cleanup=()=>{clear();$('#reactionStart').onclick=null;go.onclick=null};
}
function memory(){
 stage.innerHTML='<div class="arcade-center"><div class="arcade-big" id="memoryLevel">Level 1</div><p class="arcade-message" id="memoryMessage" role="status">Press start, watch the sequence, then repeat it.</p><div class="memory-matrix" id="memoryGrid">'+Array.from({length:9},(_,i)=>'<button class="matrix-tile" data-tile="'+i+'" aria-label="Tile '+(i+1)+'"></button>').join('')+'</div><div class="arcade-controls">'+btn('Start / next sequence','memoryStart')+btn('Restart','memoryReset','btn btn-ghost')+'</div></div>';
 const grid=$('#memoryGrid'),buttons=[...grid.querySelectorAll('button')],message=$('#memoryMessage'),levelEl=$('#memoryLevel');let sequence=[],input=[],level=1,locked=true,timers=[];
 const delay=ms=>new Promise(resolve=>{const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);resolve()},ms);timers.push(id)});
 const flash=async ix=>{buttons[ix].classList.add('lit');await delay(330);buttons[ix].classList.remove('lit');await delay(120)};
 const show=async()=>{locked=true;input=[];message.textContent='Watch the sequence…';for(const ix of sequence){await flash(ix)}locked=false;message.textContent='Your turn — repeat the sequence.'};
 const begin=()=>{sequence=[];input=[];level=1;levelEl.textContent='Level '+level;sequence.push(Math.floor(Math.random()*9));sequence.push(Math.floor(Math.random()*9));show()};
 $('#memoryStart').onclick=()=>{if(!locked){sequence.push(Math.floor(Math.random()*9));level++;levelEl.textContent='Level '+level;show()}else if(sequence.length===0)begin()};
 $('#memoryReset').onclick=begin;
 buttons.forEach((button)=>button.onclick=async()=>{if(locked)return;const ix=Number(button.dataset.tile);input.push(ix);button.classList.add('lit');await delay(100);button.classList.remove('lit');const pos=input.length-1;if(sequence[pos]!==ix){locked=true;message.textContent='Wrong tile. Reached level '+level+'.';saveBest('memory',level);return}if(input.length===sequence.length){locked=true;saveBest('memory',level);message.textContent='Perfect! Press Start / next sequence to level up.'}});
 cleanup=()=>{timers.forEach(clearTimeout);timers=[];buttons.forEach(b=>b.onclick=null);$('#memoryStart').onclick=null;$('#memoryReset').onclick=null};
}
function tiles(){
 stage.innerHTML='<div class="arcade-center"><div class="arcade-big" id="tilesScore">0</div><p class="arcade-message" id="tilesMessage" role="status">Start the round, then tap the glowing tile.</p><div class="tile-matrix" id="tilesGrid">'+Array.from({length:9},(_,i)=>'<button class="matrix-tile" data-tile="'+i+'" aria-label="Tile '+(i+1)+'"></button>').join('')+'</div><div class="arcade-controls">'+btn('Start 15 seconds','tilesStart')+'</div><div id="tilesTime" class="muted">15 seconds left</div></div>';
 const buttons=[...stage.querySelectorAll('[data-tile]')];let active=-1,score=0,remaining=15,interval=null,playing=false;
 const move=()=>{let next;do{next=Math.floor(Math.random()*buttons.length)}while(next===active);active=next;buttons.forEach((b,i)=>b.classList.toggle('lit',i===active))};
 $('#tilesStart').onclick=()=>{if(playing)return;playing=true;score=0;remaining=15;$('#tilesScore').textContent='0';$('#tilesMessage').textContent='Go!';$('#tilesTime').textContent='15 seconds left';move();interval=setInterval(()=>{remaining--;$('#tilesTime').textContent=remaining+' seconds left';if(remaining<=0){clearInterval(interval);interval=null;playing=false;active=-1;buttons.forEach(b=>b.classList.remove('lit'));$('#tilesMessage').textContent='Time! You scored '+score+'.';saveBest('tiles',score)}},1000)};
 buttons.forEach((b,i)=>b.onclick=()=>{if(!playing||i!==active)return;score++;$('#tilesScore').textContent=String(score);move()});
 cleanup=()=>{if(interval)clearInterval(interval);buttons.forEach(b=>b.onclick=null);$('#tilesStart').onclick=null};
}
function dodge(){
 stage.innerHTML='<div class="arcade-center"><div class="arcade-big" id="dodgeScore">0</div><p class="arcade-message" id="dodgeMessage" role="status">Start, then use the buttons or arrow keys. Avoid red blocks.</p><div class="dodge-board" id="dodgeBoard" aria-label="Lane dodge board"></div><div class="arcade-controls">'+btn('← Left','dodgeLeft','btn btn-ghost arcade-control')+btn('Start 30 seconds','dodgeStart')+btn('Right →','dodgeRight','btn btn-ghost arcade-control')+'</div><div id="dodgeTime" class="muted">30 seconds left</div></div>';
 const board=$('#dodgeBoard');const rows=7,cols=5;const cells=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const el=document.createElement('div');el.className='dodge-cell';el.dataset.row=r;el.dataset.col=c;board.append(el);cells.push(el)}
 let lane=2,blocks=[],score=0,remaining=30,interval=null,playing=false;const keyHandler=e=>{if(!playing)return;if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a'){e.preventDefault();lane=Math.max(0,lane-1);draw()}if(e.key==='ArrowRight'||e.key.toLowerCase()==='d'){e.preventDefault();lane=Math.min(cols-1,lane+1);draw()}};
 const draw=()=>{cells.forEach(el=>{el.className='dodge-cell';const r=Number(el.dataset.row),c=Number(el.dataset.col);if(r===rows-1&&c===lane)el.classList.add('player');if(blocks.some(b=>b.r===r&&b.c===c))el.classList.add('block')})};
 const moveLeft=()=>{if(playing){lane=Math.max(0,lane-1);draw()}};const moveRight=()=>{if(playing){lane=Math.min(cols-1,lane+1);draw()}};
 $('#dodgeLeft').onclick=moveLeft;$('#dodgeRight').onclick=moveRight;document.addEventListener('keydown',keyHandler);
 $('#dodgeStart').onclick=()=>{if(playing)return;lane=2;blocks=[];score=0;remaining=30;playing=true;$('#dodgeScore').textContent='0';$('#dodgeMessage').textContent='Dodge!';$('#dodgeTime').textContent='30 seconds left';draw();interval=setInterval(()=>{remaining--;blocks=blocks.map(b=>({r:b.r+1,c:b.c})).filter(b=>b.r<rows);if(Math.random()<.8)blocks.push({r:0,c:Math.floor(Math.random()*cols)});if(blocks.some(b=>b.r===rows-1&&b.c===lane)){clearInterval(interval);interval=null;playing=false;$('#dodgeMessage').textContent='Hit! Final score: '+score+'.';saveBest('dodge',score);return}score+=1;$('#dodgeScore').textContent=String(score);$('#dodgeTime').textContent=remaining+' seconds left';draw();if(remaining<=0){clearInterval(interval);interval=null;playing=false;$('#dodgeMessage').textContent='You survived! Score: '+score+'.';saveBest('dodge',score)}},550)};
 cleanup=()=>{if(interval)clearInterval(interval);document.removeEventListener('keydown',keyHandler);$('#dodgeLeft').onclick=null;$('#dodgeRight').onclick=null;$('#dodgeStart').onclick=null};
}
const renderers={reaction,memory,tiles,dodge};
function open(name){stop();setHeader(name);renderers[name]()}
document.querySelectorAll('[data-arcade]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.arcade)));
open('reaction');guard();