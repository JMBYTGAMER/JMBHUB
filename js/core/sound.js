const KEY='jmb-sound-enabled';
let ctx=null,master=null,musicTimer=null,enabled=localStorage.getItem(KEY)!=='off';
function audio(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.055;master.connect(ctx.destination)}if(ctx.state==='suspended')ctx.resume();return ctx}
function tone(freq,duration=.08,type='sine',gain=.035,delay=0){if(!enabled)return;const c=audio(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0.0001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(gain,c.currentTime+delay+.012);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+duration);o.connect(g);g.connect(master);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.02)}
export const JMBMusic={
 get enabled(){return enabled},
 setEnabled(v){enabled=!!v;localStorage.setItem(KEY,enabled?'on':'off');if(enabled){audio();start()}else stop();update()},
 click(){tone(520,.045,'sine',.018)},
 jump(){tone(420,.07,'square',.025);tone(660,.09,'triangle',.018,.035)},
 win(){[523,659,784,1047].forEach((f,i)=>tone(f,.12,'triangle',.035,i*.07))},
 lose(){[300,220,150].forEach((f,i)=>tone(f,.14,'sawtooth',.025,i*.08))},
 start(){if(!enabled)return;audio();start()},
 stop(){stop()}
};
function start(){if(musicTimer)return;let i=0;const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23];musicTimer=setInterval(()=>{tone(notes[i++%notes.length],.22,'triangle',.009)},260)}
function stop(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function update(){const b=document.querySelector('#jmbSoundToggle');if(b)b.textContent=enabled?'🔊 Sound ON':'🔇 Sound OFF'}
function init(){
 const b=document.createElement('button');b.id='jmbSoundToggle';b.className='btn btn-ghost jmb-sound-toggle';b.type='button';b.onclick=()=>JMBMusic.setEnabled(!enabled);document.querySelector('.portal-top-actions')?.append(b);update();
 document.addEventListener('click',e=>{if(e.target.closest('button,.btn,.game-card,.tool-choice')){JMBMusic.click();if(e.target.closest('.game-card,[data-tool]'))JMBMusic.start()}},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();