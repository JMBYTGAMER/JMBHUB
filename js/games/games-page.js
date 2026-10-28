import {guard} from '../core/auth-guard.js';
import {db,backendReady} from '../core/firebase.js';
import {collection,query,orderBy,limit,getDocs,addDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {$,toast} from '../core/ui.js';
import {openWorkspace} from '../core/workspace-window.js';
import {JMBMusic} from '../core/sound.js';
import {app} from '../core/firebase.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';
const awardCoins = app ? httpsCallable(getFunctions(app,'asia-south1'),'awardGameCoins') : null;

let user,current='snake',sessionScore=0;
const stage=$('#gameStage'),library=$('#gameLibrary');
const games=[
 ['snake','🐍','Snake','Classic snake with touch + arrow controls.'],
 ['click','⚡','Click Rush','Tap as fast as possible for 10 seconds.'],
 ['reaction','🟢','Reaction','Test how quickly you can react.'],
 ['target','🎯','Target Tap','Hit moving targets before time runs out.'],
 ['dodge','💫','Dodge Blocks','Move around and avoid incoming blocks.'],
 ['tap','🥁','Tap Tempo','Tap the beat and build a streak.'],
 ['number','🔢','Number Guess','Find the hidden number in fewer tries.'],
 ['math','🧠','Math Sprint','Solve quick math questions for points.'],
 ['color','🎨','Color Match','Tap the color that matches the word.'],
 ['whack','🔨','Whack-a-Mole','Tap the active mole before it moves.'],
 ['memory','🃏','Memory Match','Match every pair with your memory.'],
 ['tic','⭕','Tic-Tac-Toe','Play a quick solo game against the computer.'],
 ['stack','🧱','Stack Drop','Drop blocks and build the tallest tower.'],
 ['coin','🪙','Coin Catch','Move and collect coins for 20 seconds.'],
 ['flappy','🐤','Flappy Dot','Tap to fly through the gaps.'],
 ['2048','🔢','2048 Mini','Merge numbers and chase a high score.'],
 ['rps','✊','Rock Paper Scissors','Play quick rounds against the computer.'],
 ['coinflip','🪙','Coin Flip','Pick heads or tails and test your luck.'],
 ['higher','📈','Higher or Lower','Guess whether the next number is higher.'],
 ['word','🔤','Word Scramble','Unscramble a short word as fast as you can.'],
 ['aim','🎯','Aim Trainer','Tap targets quickly and improve your reaction.'],
 ['simon','🟣','Simon Lights','Repeat the growing color sequence.'],
 ['pong','🏓','Mini Pong','Keep the ball alive with the mobile paddle.'],
 ['lights','💡','Lights Out','Turn every light off in as few moves as possible.'],
 ['connect','🔴','Connect Four','Drop pieces and connect four.'],
 ['reaction2','⚡','Speed Tap','Tap the target 20 times as fast as possible.'],
 ['guesscolor','🌈','Color Guess','Guess the hidden color from clues.'],
 ['jmbdash','🟪','JMB Dash','Original rhythm runner with tap-to-jump controls.'],
 ['quickdraw','🔫','Quick Draw','Wait for GO, then tap as fast as you can.'],
 ['maze','🧩','Maze Escape','Find the exit using touch-friendly controls.'],
 ['typing','⌨️','Typing Rush','Type the shown word before the timer ends.'],
 ['dice','🎲','Dice Duel','Roll against the computer and collect wins.'],
 ['oddone','🔎','Odd One Out','Find the tile that is different.'],
 ['colormemory','🧠','Color Memory','Remember the highlighted tile and repeat it.'],
 ['safegrid','🛡️','Safe Grid','Cross the grid without hitting hidden traps.'],
 ['tilesprint','🟩','Tile Sprint','Tap the glowing tile before it moves.'],
 ['wordrush','⌨️','Word Rush','Type the target words before time runs out.'],
 ['patternlock','🧩','Pattern Lock','Remember and repeat an expanding tile pattern.']
];
let gameScope=0;
const gameTimers=new Map(),gameFrames=new Map();
const gameListeners=[];
function clearTrackedInterval(id){window.clearInterval(id);gameTimers.delete(id)}
function clearTrackedTimeout(id){window.clearTimeout(id);gameTimers.delete(id)}
function cancelTrackedFrame(id){window.cancelAnimationFrame(id);gameFrames.delete(id)}
function addGameListener(target,type,handler,options){target.addEventListener(type,handler,options);gameListeners.push({target,type,handler,options});}
function clearGameRuntime(){
 gameScope++;
 for(const [id,kind] of gameTimers){if(kind==='interval')window.clearInterval(id);else window.clearTimeout(id)}
 gameTimers.clear();
 for(const id of gameFrames.keys())window.cancelAnimationFrame(id);
 gameFrames.clear();
 for(const item of gameListeners.splice(0))item.target.removeEventListener(item.type,item.handler,item.options);
 window.onkeydown=null;
 window.JMBMusic?.stop?.();
}
function trackedTimeout(fn,ms,...args){
 const scope=gameScope;let id;
 id=window.setTimeout(()=>{gameTimers.delete(id);if(scope!==gameScope)return;fn(...args)},ms);
 gameTimers.set(id,'timeout');return id;
}
function trackedInterval(fn,ms,...args){
 const scope=gameScope;let id;
 id=window.setInterval(()=>{if(scope!==gameScope){window.clearInterval(id);gameTimers.delete(id);return}fn(...args)},ms);
 gameTimers.set(id,'interval');return id;
}
function trackedFrame(fn){
 const scope=gameScope;let id;
 id=window.requestAnimationFrame(ts=>{gameFrames.delete(id);if(scope!==gameScope)return;fn(ts)});
 gameFrames.set(id,scope);return id;
}
function tileSprint(){
 stage.innerHTML='<div class="game-view"><h2 class="game-title">🟩 Tile Sprint</h2><p class="muted">Tap only the glowing tile. You have 20 seconds.</p><div class="score-readout">Hits: <b id="tileScore">0</b> · Time: <b id="tileTime">20</b>s</div><div id="tileGrid" class="four-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:8px"></div><button class="btn btn-primary" id="tileStart">Start</button><p id="tileMsg" class="muted" aria-live="polite">Ready when you are.</p></div>';
 const grid=$('#tileGrid'),start=$('#tileStart');let active=false,score=0,left=20,target=0,iv=null;
 function draw(){target=Math.floor(Math.random()*16);grid.innerHTML=Array.from({length:16},(_,i)=>'<button type="button" data-i="'+i+'" aria-label="'+(i===target?'Target tile':'Tile')+'" style="min-height:58px;border:1px solid var(--line);border-radius:12px;background:'+(i===target?'linear-gradient(135deg,#43f0b0,#009e78)':'#12182b')+';color:'+(i===target?'#06130f':'#94a0be')+';font-size:22px">'+(i===target?'✦':'·')+'</button>').join('')}
 grid.onclick=e=>{const b=e.target.closest('[data-i]');if(!active||!b)return;if(Number(b.dataset.i)===target){score++;$('#tileScore').textContent=score;window.JMBMusic?.click?.();draw()}else{$('#tileMsg').textContent='Find the glowing tile.'}};
 start.onclick=()=>{if(active)return;score=0;left=20;active=true;start.disabled=true;$('#tileScore').textContent='0';$('#tileTime').textContent=left;$('#tileMsg').textContent='Go!';draw();iv=trackedInterval(()=>{left--;$('#tileTime').textContent=left;if(left<=0){clearTrackedInterval(iv);active=false;start.disabled=false;start.textContent='Play again';$('#tileMsg').textContent='Finished — '+score+' hits';if(score>0)saveScore('tilesprint',score*10)}},1000)};
 draw();
}
function wordRush(){
 stage.innerHTML='<div class="game-view"><h2 class="game-title">⌨️ Word Rush</h2><p class="muted">Type each word correctly. You have 30 seconds.</p><div class="score-readout">Score: <b id="wrScore">0</b> · Time: <b id="wrTime">30</b>s</div><div id="wrWord" class="big-number">READY</div><input id="wrInput" class="tool-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Type the word here" disabled><div class="tool-actions"><button class="btn btn-primary" id="wrStart">Start</button></div><p id="wrMsg" class="muted" aria-live="polite">Each correct word earns 10 points.</p></div>';
 const words=['minecraft','diamond','portal','pixel','nebula','jmbhub','rocket','emerald','community','keyboard','lightning','encryption','galaxy','rainbow','puzzle','velocity','starlight','toolbox'];let active=false,score=0,left=30,iv=null;const input=$('#wrInput'),start=$('#wrStart');
 function next(){const word=words[Math.floor(Math.random()*words.length)];$('#wrWord').textContent=word;input.value='';input.dataset.target=word}
 function check(){if(active&&input.value.trim().toLowerCase()===input.dataset.target){score+=10;$('#wrScore').textContent=score;next();window.JMBMusic?.win?.()}}
 input.addEventListener('input',check);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check()}});
 start.onclick=()=>{if(active)return;active=true;score=0;left=30;$('#wrScore').textContent=score;$('#wrTime').textContent=left;$('#wrMsg').textContent='Type fast!';input.disabled=false;start.disabled=true;start.textContent='Playing…';next();input.focus();iv=trackedInterval(()=>{left--;$('#wrTime').textContent=left;if(left<=0){clearTrackedInterval(iv);active=false;input.disabled=true;start.disabled=false;start.textContent='Play again';$('#wrMsg').textContent='Time! You scored '+score+' points.';if(score>0)saveScore('wordrush',score)}},1000)};
}
function patternLock(){
 stage.innerHTML='<div class="game-view"><h2 class="game-title">🧩 Pattern Lock</h2><p class="muted">Watch the highlighted tiles, then repeat the sequence in order.</p><div id="plGrid" class="four-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"></div><div class="score-readout" id="plMsg">Level 0</div><div class="tool-actions"><button class="btn btn-primary" id="plStart">Start</button><button class="btn btn-ghost" id="plReset">Reset</button></div></div>';
 const grid=$('#plGrid'),msg=$('#plMsg'),start=$('#plStart'),reset=$('#plReset');let seq=[],pos=0,locked=true,level=0,sequenceTimers=[];
 function clearSequence(){for(const id of sequenceTimers)clearTrackedTimeout(id);sequenceTimers=[]}
 function later(fn,ms){let id;id=trackedTimeout(()=>{sequenceTimers=sequenceTimers.filter(item=>item!==id);fn()},ms);sequenceTimers.push(id);return id}
 function draw(active=-1){grid.innerHTML=Array.from({length:9},(_,i)=>'<button type="button" data-i="'+i+'" aria-label="Pattern tile '+(i+1)+'" style="min-height:62px;border:1px solid var(--line);border-radius:12px;background:'+(i===active?'#7c5cff':'#13192c')+';color:#fff">'+(i===active?'✦':'·')+'</button>').join('')}
 function next(){clearSequence();seq.push(Math.floor(Math.random()*9));pos=0;locked=true;start.disabled=true;msg.textContent='Level '+seq.length+' — watch';draw();seq.forEach((v,i)=>{later(()=>{draw(v);later(()=>draw(),260)},i*520)});later(()=>{locked=false;start.disabled=false;msg.textContent='Repeat the pattern · '+seq.length+' tiles'},seq.length*520+280)}
 function newGame(){if(start.disabled)return;clearSequence();seq=[];pos=0;level=0;next()}
 grid.onclick=e=>{const b=e.target.closest('[data-i]');if(!b||locked||!seq.length)return;const n=Number(b.dataset.i);if(n!==seq[pos]){msg.textContent='Pattern missed. Final level: '+level;if(level>0)saveScore('patternlock',level*20);locked=true;return}pos++;window.JMBMusic?.click?.();if(pos===seq.length){level=seq.length;locked=true;msg.textContent='Correct! Level '+level;if(level>=12){saveScore('patternlock',level*20);msg.textContent='Amazing! Final score '+(level*20);return}later(next,650)}};
 start.onclick=newGame;reset.onclick=()=>{clearSequence();seq=[];pos=0;level=0;locked=true;start.disabled=false;draw();msg.textContent='Level 0'};draw();
}
const render={snake,click:clickRush,reaction,target,dodge,tap,number,math,color,whack,memory,tic,stack,coin,flappy,'2048':mini2048,rps,coinflip,higher,word,aim,simon,pong,lights,connect,reaction2,guesscolor,jmbdash:()=>arcade('jmbdash'),quickdraw:()=>arcade('quickdraw'),maze:()=>arcade('maze'),typing:()=>arcade('typing'),dice:()=>arcade('dice'),oddone:()=>arcade('oddone'),colormemory:()=>arcade('colormemory'),safegrid:()=>arcade('safegrid'),tilesprint:tileSprint,wordrush:wordRush,patternlock:patternLock};
function switchGame(name){clearGameRuntime();current=name;const info=games.find(x=>x[0]===name)||games[0];setHeader(name);loadBoard(name);stage.innerHTML='';render[name]();openWorkspace(stage,{title:info[2],description:info[3]})}
(async()=>{user=await guard();renderLibrary();})();