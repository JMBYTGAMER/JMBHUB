#!/usr/bin/env python3
"""Build narrated mobile and desktop JMB HUB tutorial videos, captions and posters."""
from __future__ import annotations
import os,subprocess,tempfile,wave
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"assets"/"tutorials"; OUT.mkdir(parents=True,exist_ok=True)
SCENES=[
{"tag":"JMB HUB • QUICK TOUR","title":"WELCOME TO JMB HUB","body":"Games, smart tools, Minecraft utilities and community features — together in one portal.","points":["One account","One dashboard","Phone + desktop"],"voice":"Welcome to JMB Hub. This tour covers sign-in, the dashboard, games, tools, virtual credits, your profile, and how to get help.","active":"Home"},
{"tag":"STEP 01 • ACCOUNT","title":"START WITH YOUR ACCOUNT","body":"Open the official JMB HUB website and choose Launch JMB HUB. Create an account or sign in with your existing account.","points":["Use your own email","Verify your email when asked","Never share sign-in codes"],"voice":"Open the official JMB Hub website and choose Launch JMB Hub. Create an account or sign in, verify your email when asked, and never share passwords or sign-in codes.","active":"Login"},
{"tag":"STEP 02 • DASHBOARD","title":"YOUR DASHBOARD IS HOME","body":"After signing in, use the dashboard cards or navigation menu to open each area. Return to the dashboard whenever you need a fresh starting point.","points":["Games","JMB Area + Security Lab","Minecraft, AI, Coins + Support"],"voice":"Your dashboard is the home base. Use its cards or menu to open Games, JMB Area, Security Lab, Minecraft, JMB AI, JMB Coins, and Support.","active":"Dashboard"},
{"tag":"STEP 03 • PLAY + CREATE","title":"PLAY, BUILD AND EXPLORE","body":"Choose a game and read its controls. In a tool workspace, read the description, enter your content, then choose the action you need.","points":["Games show their own controls","Tools explain their purpose","Some tools run in your browser"],"voice":"Open Games, choose a game, and read its controls. For a tool, read its description, enter your content, then choose the action. Some tools run locally in your browser.","active":"Games"},
{"tag":"STEP 04 • VIRTUAL COINS","title":"UNDERSTAND JMB COINS","body":"JMB Coins are virtual portal credits, not cash. Check the wallet and transaction history. Rewards and gift collection depend on the coin services being available.","points":["Not money or cryptocurrency","Check your transaction history","Do not retry failed claims repeatedly"],"voice":"JMB Coins are virtual portal credits, not cash or cryptocurrency. Check your wallet history. Rewards and admin gifts depend on coin services being online; report failed claims to Support.","active":"Coins"},
{"tag":"STEP 05 • PROFILE","title":"MAKE YOUR PROFILE YOURS","body":"Update your profile details. Birthday sharing is optional: the public celebration list displays only your chosen display name and day/month, not your birth year.","points":["Keep profile details current","Birthday sharing is optional","Review what is public"],"voice":"Use Profile to update supported details. Birthday sharing is optional; the public list shows your display name and day and month, not your birth year.","active":"Profile"},
{"tag":"STEP 06 • HELP + SAFETY","title":"NEED HELP? WE'VE GOT A GUIDE","body":"Open Help & Guide for instructions or Support to report a problem. Include the page and exact error — never send passwords, one-time codes or recovery phrases.","points":["Help & Guide for how-to steps","Support for account problems","Sign out on shared devices"],"voice":"Open Help and Guide for instructions or create a Support ticket with the page name and exact error. Never share passwords, sign-in codes, or recovery phrases. Sign out on shared devices.","active":"Support"}]
NAV=[("Home","H"),("Games","G"),("Tools","T"),("Coins","C"),("Profile","P")]
C={"bg1":(7,10,25),"bg2":(17,26,52),"text":(246,248,255),"muted":(174,188,216),"purple":(154,126,255),"cyan":(83,224,245),"green":(105,238,183),"gold":(255,215,112)}
def F(n,b=False):
 for p in (["/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf" if b else "/usr/share/fonts/opentype/inter/InterDisplay-Regular.otf","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if b else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]):
  if os.path.exists(p): return ImageFont.truetype(p,n)
 return ImageFont.load_default()
def rr(d,xy,r,fill,outline=None,width=1): d.rounded_rectangle(xy,radius=r,fill=fill,outline=outline,width=width)
def lines(d,text,f,mw):
 out=[]; cur=""
 for word in text.split():
  t=(cur+" "+word).strip()
  if d.textbbox((0,0),t,font=f)[2]<=mw or not cur: cur=t
  else: out.append(cur);cur=word
 if cur:out.append(cur)
 return out
def para(d,xy,text,f,fill,mw,sp=8):
 x,y=xy
 for line in lines(d,text,f,mw):d.text((x,y),line,font=f,fill=fill);y+=f.size+sp
 return y
def bg(size,i):
 w,h=size;im=Image.new("RGB",size);d=ImageDraw.Draw(im,"RGBA")
 for y in range(h):
  t=y/max(1,h-1);col=tuple(int(C["bg1"][k]*(1-t)+C["bg2"][k]*t) for k in range(3));d.line((0,y,w,y),fill=col)
 d.ellipse((int(w*.56),-int(h*.2),int(w*1.13),int(h*.35)),fill=(127,91,255,45));d.ellipse((-int(w*.22),int(h*.62),int(w*.42),int(h*1.12)),fill=(36,214,236,25))
 return im
def brand(d,x,y,s=1):
 q=int(42*s);rr(d,(x,y,x+q,y+q),int(12*s),(124,96,255),outline=(197,185,255));d.text((x+int(6*s),y+int(5*s)),"J",font=F(int(27*s),True),fill="white")
 d.text((x+q+int(12*s),y+int(2*s)),"JMB HUB",font=F(int(22*s),True),fill=C["text"]);d.text((x+q+int(12*s),y+int(26*s)),"YOUR DIGITAL HOME BASE",font=F(int(9*s),True),fill=C["muted"])
def phone(d,x,y,w,h,active,idx):
 rr(d,(x,y,x+w,y+h),42,(5,8,19),outline=(121,134,173),width=3);rr(d,(x+10,y+10,x+w-10,y+h-10),33,(11,17,34));rr(d,(x+w//2-38,y+14,x+w//2+38,y+25),6,(3,5,12));brand(d,x+28,y+44,.68)
 d.text((x+28,y+113),"Your world. Next level.",font=F(17,True),fill=C["text"]);d.text((x+28,y+140),"Welcome to your dashboard",font=F(10),fill=C["muted"])
 tiles=[("GAMES","G","Play & compete"),("JMB AREA","T","Smart tools"),("MINECRAFT","M","Build commands"),("JMB AI","AI","Create & explore"),("COINS","C","Virtual credits"),("SUPPORT","?","Get help")];gap=11;tw=(w-56-gap)//2;th=88
 for i,(a,b,c) in enumerate(tiles):
  col,row=i%2,i//2;xx=x+22+col*(tw+gap);yy=y+177+row*(th+10);rr(d,(xx,yy,xx+tw,yy+th),15,(36,49,83) if a.title()==active or (active=="Dashboard" and i==0) else (22,31,57),outline=(91,104,151))
  d.text((xx+12,yy+10),b,font=F(19,True),fill=C["cyan"] if i%2 else C["purple"]);d.text((xx+12,yy+39),a,font=F(10,True),fill=C["text"]);d.text((xx+12,yy+59),c,font=F(8),fill=C["muted"])
 if idx==4:rr(d,(x+22,y+h-151,x+w-22,y+h-92),12,(43,40,60),outline=C["gold"]);d.text((x+36,y+h-139),"JMB COIN WALLET",font=F(9,True),fill=C["gold"]);d.text((x+36,y+h-117),"Virtual credits + history",font=F(10),fill=C["text"])
 ny=y+h-75;rr(d,(x+18,ny,x+w-18,ny+45),14,(18,26,48))
 for i,(a,b) in enumerate(NAV):
  cx=x+42+i*((w-84)/4);col=C["cyan"] if a==active else C["muted"];d.text((int(cx),ny+4),b,font=F(15,True),fill=col);d.text((int(cx)-5,ny+25),a,font=F(7,True),fill=col)
def desktop(d,x,y,w,h,active):
 rr(d,(x,y,x+w,y+h),22,(7,11,23),outline=(116,131,171),width=2);rr(d,(x+2,y+2,x+w-2,y+44),20,(27,35,59))
 for xx,col in [(17,(255,112,129)),(37,(255,206,107)),(57,(106,226,171))]:d.ellipse((x+xx,y+16,x+xx+10,y+26),fill=col)
 rr(d,(x+116,y+12,x+w-22,y+33),10,(11,17,33));d.text((x+130,y+15),"www.jmbhost.qzz.io",font=F(9),fill=C["muted"]);sw=int(w*.21);rr(d,(x+2,y+46,x+sw,y+h-2),0,(14,21,42));brand(d,x+22,y+67,.65)
 for j,(ico,a) in enumerate([("H","Dashboard"),("G","Games"),("T","Tools"),("M","Minecraft"),("C","Coins"),("?","Support")]):
  yy=y+133+j*41;sel=a==active or (active=="Dashboard" and a=="Dashboard")
  if sel:rr(d,(x+13,yy-6,x+sw-12,yy+27),9,(48,54,102))
  d.text((x+28,yy),ico,font=F(13,True),fill=C["cyan"] if sel else C["muted"]);d.text((x+50,yy+1),a,font=F(10,True),fill=C["text"] if sel else C["muted"])
 cx=x+sw+24;d.text((cx,y+73),"Welcome to JMB HUB",font=F(22,True),fill=C["text"]);d.text((cx,y+106),"Your games, tools and creator workspace",font=F(10),fill=C["muted"])
 cards=[("GAMES","Play & compete","G"),("JMB AREA","Smart tools","T"),("MINECRAFT","Build & explore","M"),("JMB AI","AI workspace","AI"),("JMB COINS","Virtual credits","C"),("SUPPORT","Help centre","?")];gap=12;cw=(w-sw-60-2*gap)//3
 for i,(a,b,c) in enumerate(cards):
  col,row=i%3,i//3;xx=cx+col*(cw+gap);yy=y+141+row*99;rr(d,(xx,yy,xx+cw,yy+87),13,(28,39,70),outline=(64,78,124));d.text((xx+12,yy+10),c,font=F(19,True),fill=C["purple"] if i%2==0 else C["cyan"]);d.text((xx+12,yy+40),a,font=F(10,True),fill=C["text"]);d.text((xx+12,yy+59),b,font=F(8),fill=C["muted"])
def render(scene,idx,mob):
 size=(720,1280) if mob else (1280,720);im=bg(size,idx);d=ImageDraw.Draw(im);w,h=size
 if mob:
  brand(d,42,40,.88);d.text((42,112),scene["tag"],font=F(15,True),fill=C["cyan"]);d.text((42,150),scene["title"],font=F(30,True),fill=C["text"]);yy=para(d,(42,202),scene["body"],F(18),C["muted"],w-84,10);mx=(w-320)//2;my=min(max(430,yy+28),470);phone(d,mx,my,320,640,scene["active"],idx)
  py=my+754
  for p in scene["points"]:d.ellipse((47,py+5,60,py+18),fill=C["green"]);d.text((76,py),p,font=F(15,True),fill=C["text"]);py+=32
  d.text((42,h-53),"JMB HUB • ILLUSTRATED WALKTHROUGH",font=F(11,True),fill=C["muted"])
 else:
  brand(d,54,42,1.05);d.text((54,132),scene["tag"],font=F(17,True),fill=C["cyan"]);tf=F(34 if len(scene["title"])<27 else 30,True);yy=para(d,(54,174),scene["title"],tf,C["text"],440,5);yy=para(d,(54,yy+20),scene["body"],F(17),C["muted"],440,11);py=max(420,yy+28)
  for p in scene["points"]:d.ellipse((58,py+5,72,py+19),fill=C["green"]);d.text((90,py),p,font=F(16,True),fill=C["text"]);py+=40
  desktop(d,535,116,690,490,scene["active"]);d.text((54,h-44),"JMB HUB • ILLUSTRATED WALKTHROUGH",font=F(12,True),fill=C["muted"])
 rr(d,(w-122,44,w-48,54),5,(255,255,255,45));rr(d,(w-122,44,w-122+int(74*(idx+1)/len(SCENES)),54),5,C["cyan"]);return im
def run(cmd):subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def synth(text,path):
 run(["espeak","-v","en-us+f3","-s","148","-p","48","-a","165","-w",str(path),text])
 with wave.open(str(path),"rb") as wf:return wf.getnframes()/wf.getframerate()
def stamp(sec):
 ms=int(round(sec*1000));hh,ms=divmod(ms,3600000);mm,ms=divmod(ms,60000);ss,ms=divmod(ms,1000);return f"{hh:02d}:{mm:02d}:{ss:02d}.{ms:03d}"
def build(mob,filename):
 with tempfile.TemporaryDirectory(prefix="jmb-tutorial-") as tmp:
  tmp=Path(tmp);parts=[];cues=[];timeline=0.0
  for i,scene in enumerate(SCENES):
   img=tmp/f"s{i}.png";wav=tmp/f"a{i}.wav";part=tmp/f"p{i}.mp4";render(scene,i,mob).save(img,optimize=True);vlen=synth(scene["voice"],wav);duration=vlen+.65;fade=max(.1,duration-.45);cues += [f"{stamp(timeline)} --> {stamp(timeline+vlen)}",scene["voice"],""];timeline+=duration
   vf=f"scale={'540:960' if mob else '960:540'},fps=12,fade=t=in:st=0:d=.28,fade=t=out:st={fade:.3f}:d=.42,format=yuv420p";af=f"afade=t=in:st=0:d=.15,afade=t=out:st={fade:.3f}:d=.4,apad"
   run(["ffmpeg","-y","-loop","1","-framerate","12","-i",str(img),"-i",str(wav),"-t",f"{duration:.3f}","-vf",vf,"-af",af,"-c:v","libx264","-preset","ultrafast","-crf","34","-tune","stillimage","-pix_fmt","yuv420p","-r","12","-c:a","aac","-b:a","96k","-ar","44100","-ac","2","-shortest",str(part)]);parts.append(part)
  cat=tmp/"concat.txt";cat.write_text("\n".join(f"file '{p.as_posix()}'" for p in parts)+"\n",encoding="utf-8");(OUT/("jmb-hub-mobile-captions.vtt" if mob else "jmb-hub-desktop-captions.vtt")).write_text("WEBVTT\n\n"+"\n".join(cues),encoding="utf-8");render(SCENES[0],0,mob).save(OUT/("jmb-hub-mobile-poster.png" if mob else "jmb-hub-desktop-poster.png"),optimize=True)
  out=OUT/filename;run(["ffmpeg","-y","-f","concat","-safe","0","-i",str(cat),"-c","copy","-movflags","+faststart",str(out)]);print(f"Created {out} ({out.stat().st_size:,} bytes)")
def main():build(True,"jmb-hub-mobile-tutorial.mp4");build(False,"jmb-hub-desktop-tutorial.mp4")
if __name__=="__main__":main()
