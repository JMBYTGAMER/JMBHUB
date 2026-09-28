import {JMBMusic} from '../core/sound.js';
const c=document.querySelector('#gdCanvas'),ctx=c.getContext('2d'),start=document.querySelector('#gdStart'),jumpBtn=document.querySelector('#gdJump');
const progressEl=document.querySelector('#gdProgress'),scoreEl=document.querySelector('#gdScore'),speedEl=document.querySelector('#gdSpeed');
let running=false,raf=0,player,obstacles=[],distance=0,score=0,speed=5,beat=0;
function reset(){distance=0;score=0;speed=5;player={x:120,y:335,w:30,h:30,vy:0,ground:true,rot:0};obstacles=[];let x=520;for(let i=0;i<45;i++){x+=170+Math.random()*190;obstacles.push({x,h:28+Math.random()*58,w:28});if(i%7===4)obstacles.push({x:x+100,h:20,w:28})}}
function jump(){if(!running)return;if(player.ground){player.vy=-13;player.ground=false;JMBMusic.jump()}}
function collide(a,b){return a.x<a.x+a.w&&a.x+b.w>b.x&&a.y+a.h>b.y&&a.y<b.y+b.h}
function draw(){
 ctx.clearRect(0,0,c.width,c.height);
 const g=ctx.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#111a38');g.addColorStop(1,'#070a14');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
 const pulse=12+Math.sin(beat)*5;ctx.strokeStyle='rgba(124,92,255,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(480,190,pulse+80,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#10182b';ctx.fillRect(0,365,c.width,55);ctx.fillStyle='#7c5cff';ctx.fillRect(0,360,c.width,5);
 ctx.save();ctx.translate(player.x+15,player.y+15);ctx.rotate(player.rot);ctx.fillStyle='#00d4ff';ctx.fillRect(-15,-15,30,30);ctx.fillStyle='#fff';ctx.fillRect(-6,-6,5,5);ctx.fillRect(3,-6,5,5);ctx.restore();
 ctx.fillStyle='#ff5578';for(const o of obstacles){const sx=o.x-distance;if(sx<-50||sx>c.width+50)continue;ctx.beginPath();ctx.moveTo(sx,365);ctx.lineTo(sx+o.w/2,365-o.h);ctx.lineTo(sx+o.w,365);ctx.closePath();ctx.fill()}
 ctx.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<24;i++){const x=(i*91-(distance*.18))%c.width;ctx.fillRect(x<0?x+c.width:x,55+(i*37)%170,2,2)}
}
function frame(t){
 if(!running)return;
 beat=t/180;speed=5+distance/900;speedEl.textContent=(speed/5).toFixed(1)+'×';
 player.vy+=.65;player.y+=player.vy;if(player.y>=335){player.y=335;player.vy=0;player.ground=true;player.rot=Math.round(player.rot/(Math.PI/2))*(Math.PI/2)}else player.rot+=.12;
 distance+=speed;score=Math.floor(distance/10);
 const pct=Math.min(100,distance/Math.max(1,obstacles[obstacles.length-1].x-120)*100);progressEl.textContent=Math.floor(pct)+'%';scoreEl.textContent=score;
 for(const o of obstacles){const sx=o.x-distance;if(sx>-50&&sx<c.width+50){const box={x:sx,y:365-o.h,w:o.w,h:o.h};if(collide(player,box)){running=false;JMBMusic.lose();start.textContent='↻ Try Again';return}}}
 if(pct>=100){running=false;progressEl.textContent='100%';JMBMusic.win();start.textContent='🏆 Level Complete';return}
 draw();raf=requestAnimationFrame(frame);
}
function begin(){cancelAnimationFrame(raf);reset();running=true;start.textContent='RUNNING';JMBMusic.start();draw();raf=requestAnimationFrame(frame)}
start.onclick=begin;jumpBtn.onclick=jump;c.addEventListener('pointerdown',e=>{e.preventDefault();if(!running)begin();else jump()});addEventListener('keydown',e=>{if(e.code==='Space'||e.key==='ArrowUp'){e.preventDefault();jump()}});
reset();draw();