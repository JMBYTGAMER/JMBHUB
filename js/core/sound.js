const KEY='jmb-sound-enabled';
const VOLUME_KEY='jmb-sound-volume';
let ctx=null,master=null,musicTimer=null,birthdayTimer=null,enabled=true,birthdayActive=false;
let volume=.72,birthdayNodes=[];
try{
  enabled=localStorage.getItem(KEY)!=='off';
  const saved=Number(localStorage.getItem(VOLUME_KEY));
  if(Number.isFinite(saved) && localStorage.getItem(VOLUME_KEY)!==null) volume=Math.max(0,Math.min(1,saved));
}catch{}

function audio(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return null;
    if(!ctx){
      ctx=new C();
      master=ctx.createGain();
      master.gain.value=volume;
      master.connect(ctx.destination);
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return ctx;
  }catch{return null}
}
function tone(freq,duration=.08,type='sine',gain=.035,delay=0){
  if(!enabled)return;
  const c=audio();if(!c||!master)return;
  try{
    const o=c.createOscillator(),g=c.createGain();
    const start=c.currentTime+delay;
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(.0001,start);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+.012);
    g.gain.exponentialRampToValueAtTime(.0001,start+Math.max(.025,duration));
    o.connect(g);g.connect(master);o.start(start);o.stop(start+duration+.025);
  }catch{}
}
function startMusic(){
  if(!enabled||musicTimer)return;
  if(!audio())return;
  let i=0;const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23];
  musicTimer=setInterval(()=>tone(notes[i++%notes.length],.22,'triangle',.006),340);
}
function stopMusic(){
  if(musicTimer){clearInterval(musicTimer);musicTimer=null}
}
function stopBirthdaySong(){
  birthdayActive=false;
  if(birthdayTimer){clearTimeout(birthdayTimer);birthdayTimer=null}
  birthdayNodes.forEach(node=>{
    try{node.stop();node.disconnect()}catch{}
  });
  birthdayNodes=[];
}
const birthdayMelody=[
  [392,1],[392,1],[440,2],[392,2],[523.25,2],[493.88,3],
  [392,1],[392,1],[440,2],[392,2],[587.33,2],[523.25,3],
  [392,1],[392,1],[783.99,2],[659.25,2],[523.25,2],[493.88,2],[440,3],
  [698.46,1],[698.46,1],[659.25,2],[523.25,2],[587.33,2],[523.25,3]
];
function scheduleBirthdayPhrase(){
  const c=audio();if(!c||!master||!birthdayActive)return;
  const beat=.31;
  let delay=.04;
  for(const [frequency,beats] of birthdayMelody){
    const duration=beats*beat*.88;
    try{
      const oscillator=c.createOscillator();
      const envelope=c.createGain();
      const start=c.currentTime+delay;
      oscillator.type='triangle';
      oscillator.frequency.setValueAtTime(frequency,start);
      envelope.gain.setValueAtTime(.0001,start);
      envelope.gain.exponentialRampToValueAtTime(.085,start+.018);
      envelope.gain.setValueAtTime(.085,start+Math.max(.035,duration-.045));
      envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
      oscillator.connect(envelope);envelope.connect(master);
      oscillator.start(start);oscillator.stop(start+duration+.03);
      birthdayNodes.push(oscillator);
    }catch{}
    delay+=beats*beat;
  }
  birthdayTimer=window.setTimeout(()=>{
    birthdayTimer=null;
    birthdayNodes=[];
    if(birthdayActive)scheduleBirthdayPhrase();
  },delay*1000+220);
}
function startBirthdaySong(){
  if(!enabled)JMBMusic.setEnabled(true);
  stopMusic();
  stopBirthdaySong();
  if(!audio())return false;
  birthdayActive=true;
  scheduleBirthdayPhrase();
  return true;
}
function update(){
  const b=document.querySelector('#jmbSoundToggle');if(!b)return;
  b.textContent=enabled?'🔊 Sound on':'🔇 Sound off';
  b.setAttribute('aria-pressed',String(enabled));
}

export const JMBMusic={
  get enabled(){return enabled},
  get volume(){return volume},
  get birthdayPlaying(){return birthdayActive},
  setEnabled(v){
    enabled=!!v;
    try{localStorage.setItem(KEY,enabled?'on':'off')}catch{}
    if(enabled)audio();
    else{stopMusic();stopBirthdaySong()}
    update();
  },
  setVolume(value){
    const next=Number(value);
    if(!Number.isFinite(next))return volume;
    volume=Math.max(0,Math.min(1,next));
    try{localStorage.setItem(VOLUME_KEY,String(volume))}catch{}
    if(master&&ctx){
      try{master.gain.setTargetAtTime(volume,ctx.currentTime,.035)}catch{master.gain.value=volume}
    }
    return volume;
  },
  click(){tone(520,.045,'sine',.012)},
  jump(){tone(420,.07,'square',.017);tone(660,.09,'triangle',.012,.035)},
  win(){[523,659,784,1047].forEach((f,i)=>tone(f,.12,'triangle',.023,i*.07))},
  lose(){[300,220,150].forEach((f,i)=>tone(f,.14,'triangle',.018,i*.08))},
  notify(){[784,988,1175].forEach((f,i)=>tone(f,.13,'sine',.024,i*.1))},
  start(){if(!enabled)return;audio();startMusic()},
  stop(){stopMusic();stopBirthdaySong()},
  birthdaySong(){return startBirthdaySong()},
  stopBirthday(){stopBirthdaySong()}
};
window.JMBMusic=JMBMusic;

function init(){
  let b=document.getElementById('jmbSoundToggle');
  if(!b){
    b=document.createElement('button');
    b.id='jmbSoundToggle';b.className='btn btn-ghost jmb-sound-toggle';
    b.type='button';b.setAttribute('aria-label','Toggle JMB sound effects and music');
    document.body.append(b);
  }
  b.onclick=()=>JMBMusic.setEnabled(!enabled);update();
  document.addEventListener('click',e=>{
    const t=e.target instanceof Element?e.target:null;if(!t)return;
    if(t.closest('button,.btn,.game-card,.tool-choice'))JMBMusic.click();
    if(t.closest('.game-card,[data-game]'))JMBMusic.start();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)JMBMusic.stop()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
