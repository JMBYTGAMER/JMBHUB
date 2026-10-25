const KEY='jmb-sound-enabled';
let ctx=null,master=null,musicTimer=null,enabled=true;
try{enabled=localStorage.getItem(KEY)!=='off'}catch{}
function audio(){
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return null;
  if(!ctx){ctx=new C();master=ctx.createGain();master.gain.value=.72;master.connect(ctx.destination)}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return ctx;
 }catch{return null}
}
function tone(freq,duration=.08,type='sine',gain=.035,delay=0){
 if(!enabled)return;
 const c=audio();if(!c||!master)return;
 try{
  const o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,c.currentTime+delay);
  g.gain.exponentialRampToValueAtTime(gain,c.currentTime+delay+.012);
  g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+duration);
  o.connect(g);g.connect(master);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.02);
 }catch{}
}
function startMusic(){
 if(!enabled||musicTimer)return;
 if(!audio())return;
 let i=0;const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23];
 musicTimer=setInterval(()=>tone(notes[i++%notes.length],.22,'triangle',.006),340);
}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function update(){
 const b=document.querySelector('#jmbSoundToggle');if(!b)return;
 b.textContent=enabled?'🔊 Sound on':'🔇 Sound off';
 b.setAttribute('aria-pressed',String(enabled));
}
export const JMBMusic={
 get enabled(){return enabled},
 setEnabled(v){
  enabled=!!v;try{localStorage.setItem(KEY,enabled?'on':'off')}catch{}
  if(enabled)audio();else stopMusic();update();
 },
 click(){tone(520,.045,'sine',.012)},
 jump(){tone(420,.07,'square',.017);tone(660,.09,'triangle',.012,.035)},
 win(){[523,659,784,1047].forEach((f,i)=>tone(f,.12,'triangle',.023,i*.07))},
 lose(){[300,220,150].forEach((f,i)=>tone(f,.14,'triangle',.018,i*.08))},
 notify(){[784,988,1175].forEach((f,i)=>tone(f,.13,'sine',.024,i*.1))},
 start(){if(!enabled)return;audio();startMusic()},
 stop(){stopMusic()}
};
window.JMBMusic=JMBMusic;
function init(){
 let b=document.getElementById('jmbSoundToggle');
 if(!b){b=document.createElement('button');b.id='jmbSoundToggle';b.className='btn btn-ghost jmb-sound-toggle';b.type='button';b.setAttribute('aria-label','Toggle JMB sound effects and music');document.body.append(b)}
 b.onclick=()=>JMBMusic.setEnabled(!enabled);update();
 document.addEventListener('click',e=>{
  const t=e.target instanceof Element?e.target:null;if(!t)return;
  if(t.closest('button,.btn,.game-card,.tool-choice'))JMBMusic.click();
  if(t.closest('.game-card,[data-game]'))JMBMusic.start();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
