import {JMBMusic} from '../core/sound.js';
const c=document.querySelector('#gdCanvas'),ctx=c.getContext('2d'),start=document.querySelector('#gdStart'),jumpBtn=document.querySelector('#gdJump'),pauseBtn=document.querySelector('#gdPause');
const progressEl=document.querySelector('#gdProgress'),scoreEl=document.querySelector('#gdScore'),speedEl=document.querySelector('#gdSpeed');
let running=false,paused=false,raf=0,player,obstacles=[],coins=[],particles=[],distance=0,score=0,speed=5,beat=0,levelEnd=7000,checkpoint=0,lastGround=0;
const levels=[
 {name:'Neon Start',length:7200,base:5,pattern:[170,210,260,190,300,180,230]},
 {name:'Pulse Run',length:8400,base:5.4,pattern:[150,170,220,150,260,140,190,230]},
 {name:'Hyper Core',length:9800,base:5.8,pattern:[135,155,180,145,210,125,170,200]}
];
let level=0;
function makeLevel(){const L=levels[level];levelEnd=L.length;obstacles=[];coins=[];let x=520,i=0;while(x<L.length+500){const gap=L.pattern[i%L.pattern.length];x+=gap;const h=30+((i*29)%58);obstacles.push({x,h,w:30,kind:i%5===3?'double':'spike'});if(i%4===1)coins.push({x:x+75,y:275+(i%2)*35,r:8,taken:false});if(i%6===4)obstacles.push({x:x+72,h:22,w:30,kind:'spike'});i++}}
function reset(){distance=0;score=0;speed=levels[level].base;checkpoint=0;lastGround=0;player={x:120,y:335,w:30,h:30,vy:0,ground:true,rot:0,coyote:0};particles=[];makeLevel()}
function addBurst(px,py,n=12){for(let i=0;i<n;i++)particles.push({x:px,y:py,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*5,life:1})}
function jump(){if(!running||paused)return;if(player.ground||player.coyote>0){player.vy=-13;player.ground=false;player.coyote=0;addBurst(player.x+15,365,7);JMBMusic.jump()}}
function collide(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function draw(){
 ctx.clearRect(0,0,c.width,c.height);
 const g=ctx.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#111a38');g.addColorStop(.55,'#090e20');g.addColorStop(1,'#050710');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
 const pulse=95+Math.sin(beat)*18;ctx.strokeStyle='rgba(0,212,255,.16)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(480,205,pulse,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.65)';for(let i=0;i<35;i++){let sx=(i*113-distance*.22)%c.width; if(sx<0)sx+=c.width;ctx.fillRect(sx,45+(i*41)%190,2+(i%2),2+(i%2))}
 ctx.fillStyle='#10182b';ctx.fillRect(0,365,c.width,55);ctx.fillStyle='#7c5cff';ctx.fillRect(0,360,c.width,5);
 ctx.fillStyle='#ff5578';for(const o of obstacles){const sx=o.x-distance;if(sx<-60||sx>c.width+60)continue;if(o.kind==='double'){ctx.beginPath();ctx.moveTo(sx,365);ctx.lineTo(sx+15,365-o.h);ctx.lineTo(sx+30,365);ctx.lineTo(sx+45,365-o.h);ctx.lineTo(sx+60,365);ctx.closePath();ctx.fill()}else{ctx.beginPath();ctx.moveTo(sx,365);ctx.lineTo(sx+o.w/2,365-o.h);ctx.lineTo(sx+o.w,365);ctx.closePath();ctx.fill()}}
 for(const q of coins){if(q.taken)continue;const sx=q.x-distance;if(sx>-20&&sx<c.width+20){ctx.fillStyle='#ffd45a';ctx.beginPath();ctx.arc(sx,q.y,q.r+Math.sin(beat*2+q.x)*2,0,7);ctx.fill();ctx.fillStyle='#fff3a0';ctx.fillRect(sx-2,q.y-5,4,10)}}
 for(const q of particles){ctx.globalAlpha=Math.max(0,q.life);ctx.fillStyle='#31d7ff';ctx.fillRect(q.x,q.y,4,4)}ctx.globalAlpha=1;
 ctx.save();ctx.translate(player.x+15,player.y+15);ctx.rotate(player.rot);ctx.fillStyle='#00d4ff';ctx.shadowBlur=20;ctx.shadowColor='#00d4ff';ctx.fillRect(-15,-15,30,30);ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.fillRect(-7,-6,5,5);ctx.fillRect(3,-6,5,5);ctx.restore();
}
function fail(){running=false;paused=false;JMBMusic.lose();addBurst(player.x+15,player.y+15,25);start.textContent='↻ Try Again';pauseBtn.textContent='Ⅱ Pause';toast('Crash! Checkpoint '+checkpoint+' — try again');draw()}
function toast(msg){let el=document.querySelector('#gdProgress');el.textContent=msg}
function frame(t){
 if(!running)return;if(paused){raf=requestAnimationFrame(frame);return}
 beat=t/180;const L=levels[level];
 speed=L.base+distance/(L.length*0.9)*2.7;speedEl.textContent=(speed/L.base).toFixed(1)+'×';
 player.vy+=.68;player.y+=player.vy;
 if(player.y>=335){if(!player.ground)addBurst(player.x+15,365,5);player.y=335;player.vy=0;player.ground=true;player.coyote=.12;player.rot=Math.round(player.rot/(Math.PI/2))*(Math.PI/2)}else{player.ground=false;player.coyote=Math.max(0,player.coyote-.016);player.rot+=.13}
 distance+=speed;score=Math.floor(distance/8);
 const pct=Math.min(100,distance/levelEnd*100);progressEl.textContent=Math.floor(pct)+'%';scoreEl.textContent=score;
 const cp=Math.floor(pct/25)*25;if(cp>checkpoint){checkpoint=cp;JMBMusic.click?.();addBurst(480,200,18)}
 for(const q of particles){q.x+=q.vx;q.y+=q.vy;q.vy+=.08;q.life-=.025}particles=particles.filter(q=>q.life>0);
 for(const o of obstacles){const sx=o.x-distance;if(sx>-60&&sx<c.width+60){const box={x:sx,y:365-o.h,w:o.kind==='double'?60:o.w,h:o.h};if(collide(player,box)){fail();return}}}
 for(const q of coins){const sx=q.x-distance;if(!q.taken&&Math.hypot(player.x+15-sx,player.y+15-q.y)<24){q.taken=true;score+=50;addBurst(sx,q.y,14);JMBMusic.click?.()}}
 if(pct>=100){running=false;JMBMusic.win();addBurst(player.x+15,player.y+15,40);progressEl.textContent='100% • '+L.name;start.textContent=level<levels.length-1?'▶ Next Level':'🏆 Completed All Levels';pauseBtn.textContent='Ⅱ Pause';return}
 draw();raf=requestAnimationFrame(frame)
}
function begin(next=false){cancelAnimationFrame(raf);if(next&&level<levels.length-1)level++;reset();running=true;paused=false;start.textContent='RUNNING';pauseBtn.textContent='Ⅱ Pause';JMBMusic.start();draw();raf=requestAnimationFrame(frame)}
function pause(){if(!running)return;paused=!paused;pauseBtn.textContent=paused?'▶ Resume':'Ⅱ Pause'}
start.onclick=()=>{if(!running&&document.querySelector('#gdProgress').textContent.includes('100%')&&level<levels.length-1)begin(true);else begin(false)}
jumpBtn.onclick=jump;pauseBtn.onclick=pause;c.addEventListener('pointerdown',e=>{e.preventDefault();if(!running)begin(false);else jump()});addEventListener('keydown',e=>{if(['Space','ArrowUp','p','P'].includes(e.code)||e.key==='p'||e.key==='P')e.preventDefault();if(e.code==='Space'||e.key==='ArrowUp')jump();if(e.key==='p'||e.key==='P')pause()});reset();draw();