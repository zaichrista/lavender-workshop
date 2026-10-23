/* =====================================================================
   A tiny Van Gogh brush, shared by the home page and the gallery.
   Same idea as the workshop: every mark is a short curved stroke
   (x, y, length, width, angle, colour), thousands of them, never blended.
   ===================================================================== */
(function(){
  const VG=window.VG={};
  VG.rng=a=>function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  VG.tick=()=>new Promise(r=>requestAnimationFrame(r));
  VG.hsl=(h,s,l,a=1)=>`hsla(${h|0},${s|0}%,${l|0}%,${a})`;
  VG.lerp=(a,b,t)=>a+(b-a)*t;

  /* one brush mark, slightly bent */
  VG.stroke=function(g,x,y,len,w,ang,col,cv=0){
    const dx=Math.cos(ang)*len*.5, dy=Math.sin(ang)*len*.5;
    g.strokeStyle=col; g.lineWidth=w; g.lineCap='round'; g.beginPath(); g.moveTo(x-dx,y-dy);
    if(cv) g.quadraticCurveTo(x-dy*cv,y+dx*cv,x+dx,y+dy); else g.lineTo(x+dx,y+dy);
    g.stroke();
  };

  /* fill a rectangle with scattered strokes. col(x,y,i) and ang(x,y) are functions.
     async: hands control back to the browser every few thousand strokes, so the page stays soft and responsive */
  VG.field=async function(g,box,col,ang,o){
    const [x0,y0,x1,y1]=box, rnd=o.rnd, R=(a,b)=>a+(b-a)*rnd();
    const len=o.len||[8,16], wid=o.wid||[2,4], dens=o.dens??2.4, cv=o.cv??.2, aj=o.aj??.3;
    const n=Math.min(((x1-x0)*(y1-y0)*dens/(((len[0]+len[1])/2)*((wid[0]+wid[1])/2)))|0,500000);
    g.save(); g.beginPath(); g.rect(x0,y0,x1-x0,y1-y0); g.clip();
    for(let i=0;i<n;i++){
      const x=R(x0,x1), y=R(y0,y1);
      VG.stroke(g,x,y,R(len[0],len[1]),R(wid[0],wid[1]),ang(x,y)+R(-aj,aj),col(x,y,i),cv*R(-1,1));
      if(i%5000===4999) await VG.tick();
    }
    g.restore();
  };

  /* a stroke that follows a flow field for a few steps, so the marks swirl */
  VG.flowStroke=function(g,x,y,len,w,angFn,col){
    const k=4, st=len/k; g.strokeStyle=col; g.lineWidth=w; g.lineCap='round'; g.lineJoin='round';
    g.beginPath(); g.moveTo(x,y);
    for(let i=0;i<k;i++){ const a=angFn(x,y); x+=Math.cos(a)*st; y+=Math.sin(a)*st; g.lineTo(x,y); }
    g.stroke();
  };

  /* the green backdrop: Starry-Night-style vortices, pastel greens, soft yellow-green light at the cores */
  VG.swirl=async function(g,W,H,seed){
    const rnd=VG.rng(seed), R=(a,b)=>a+(b-a)*rnd(), m=Math.min(W,H);
    const C=[[.2,.32,.2,1],[.72,.64,.24,-1],[.52,.1,.15,1],[.9,.22,.12,-1],[.08,.85,.17,-1],[.42,.78,.13,1]].map(c=>({x:c[0]*W,y:c[1]*H,r:c[2]*m,s:c[3]}));
    const field=(x,y)=>{
      let vx=Math.cos(Math.sin(x*.0045)*.9+Math.cos(y*.0035)*.7)*.35, vy=Math.sin(Math.sin(x*.0045)*.9+Math.cos(y*.0035)*.7)*.35, glow=0;
      for(const c of C){ const dx=x-c.x, dy=y-c.y, d2=dx*dx+dy*dy, w=Math.exp(-d2/(2*c.r*c.r)), a=Math.atan2(dy,dx)+c.s*Math.PI/2; vx+=Math.cos(a)*w*2; vy+=Math.sin(a)*w*2; glow+=Math.exp(-d2/(.5*c.r*c.r)); }
      return {a:Math.atan2(vy,vx),glow:Math.min(1,glow)};
    };
    g.fillStyle=VG.hsl(112,32,74); g.fillRect(0,0,W,H);
    const passes=[{len:[26,46],wid:[7,12],dens:1.5,a:.9},{len:[16,30],wid:[3,6],dens:3.4,a:.85},{len:[8,16],wid:[1.6,3],dens:1.6,a:.8}];
    for(const p of passes){
      const n=(W*H*p.dens/(((p.len[0]+p.len[1])/2)*((p.wid[0]+p.wid[1])/2)))|0;
      for(let i=0;i<n;i++){
        const x=R(-10,W+10), y=R(-10,H+10), f=field(x,y), q=rnd();
        let h=VG.lerp(118,98,f.glow)+Math.sin(x*.006+y*.004)*14+R(-8,8), s=R(26,48), l=VG.lerp(66,84,f.glow)+R(-7,7);
        if(q<.07){ l-=22; s+=8; } else if(q>.94){ h=78; s=45; l=88; }      // a few deeper greens, a few creamy highlights
        VG.flowStroke(g,x,y,R(p.len[0],p.len[1]),R(p.wid[0],p.wid[1]),(px,py)=>field(px,py).a+R(-.06,.06),VG.hsl(h,s,l,p.a));
        if(i%2500===2499) await VG.tick();
      }
    }
  };

  /* THE BOIL, same as the workshop: several paintings of the same scene, and every second or so the page
     quietly flicks to a different one (with a hair of jitter). The shapes never move, only the paint.
     targets = [{cv, frames:[canvas,...]}]; frames can keep arriving while it runs. */
  VG.flicker=function(targets,still){
    let cur=-1, next=0;
    function loop(ts){
      const n=Math.min(...targets.map(t=>t.frames.length));
      if(n>=1&&ts>=next){
        let k=cur; if(still) k=0; else if(n>1) while(k===cur) k=(Math.random()*n)|0; else k=0; cur=k;
        const ox=still?0:Math.random()*1.2-.6, oy=still?0:Math.random()*1.2-.6;
        for(const t of targets){ const g=t.cv.getContext('2d'); g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,t.cv.width,t.cv.height); g.drawImage(t.frames[cur%t.frames.length],t.still?0:ox,t.still?0:oy,t.cv.width,t.cv.height); }
        next=ts+90+Math.random()*50;
        if(still) return;                                                  // one painting, held still
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

  const MONO='ui-monospace,Menlo,Consolas,"Courier New",monospace';
  /* writing made of brush marks: the letters are only used as a stencil, the ink is strokes. */
  VG.paintedText=function(g,text,cx,cy,o){
    const r=o.r||1, rnd=VG.rng(o.seed), R=(a,b)=>a+(b-a)*rnd(), cw=g.canvas.width, ch=g.canvas.height;
    const m=document.createElement('canvas'); m.width=cw; m.height=ch; const mg=m.getContext('2d',{willReadFrequently:true});
    mg.scale(r,r); mg.font=`${o.weight||400} ${o.size}px ${MONO}`; mg.textAlign='center'; mg.textBaseline='middle';
    try{ mg.letterSpacing=(o.spacing||0)+'px'; }catch(e){}
    mg.fillText(text,cx,cy);
    if(o.under){ g.save(); g.font=mg.font; g.textAlign='center'; g.textBaseline='middle'; try{ g.letterSpacing=(o.spacing||0)+'px'; }catch(e){} g.fillStyle=o.under; g.fillText(text,cx,cy); g.restore(); }
    const d=mg.getImageData(0,0,cw,ch).data, pts=[];
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++) if(d[(y*cw+x)*4+3]>110) pts.push(x,y);
    const np=pts.length/2, n=Math.ceil(np/(r*r)*(o.dens||3.2)/10), [h,sat,l]=o.hsl||[145,26,28];
    for(let i=0;i<n;i++){
      const k=((rnd()*np)|0)*2, x=pts[k]/r, y=pts[k+1]/r;
      VG.stroke(g,x,y,R(3.2,6.5)*(o.size/30),R(1.2,2.2)*(o.size/30),-.55+R(-.7,.7),VG.hsl(h+R(-10,10),sat+R(-6,8),l+R(-7,10),R(.7,.95)),R(-.25,.25));
    }
  };

  /* a hand-drawn box: wobbly pencil-and-brush outline that doesn't quite close, plus a pale wash inside */
  VG.handBox=async function(g,x0,y0,x1,y1,seed,o={}){
    const rnd=VG.rng(seed), R=(a,b)=>a+(b-a)*rnd(), rad=Math.min(16,(y1-y0)/2), pts=[];
    const arc=(cx,cy,a0)=>{ for(let i=0;i<=5;i++){ const a=a0+i/5*Math.PI/2; pts.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]); } };
    const line=(ax,ay,bx,by)=>{ const n=Math.max(2,Math.round(Math.hypot(bx-ax,by-ay)/6)); for(let i=1;i<n;i++) pts.push([ax+(bx-ax)*i/n,ay+(by-ay)*i/n]); };
    arc(x0+rad,y0+rad,Math.PI); line(x0+rad,y0,x1-rad,y0); arc(x1-rad,y0+rad,-Math.PI/2); line(x1,y0+rad,x1,y1-rad);
    arc(x1-rad,y1-rad,0); line(x1-rad,y1,x0+rad,y1); arc(x0+rad,y1-rad,Math.PI/2); line(x0,y1-rad,x0,y0+rad);
    const ph=R(0,6), N=pts.length, [h,sat,l]=o.hsl||[145,26,28];
    await VG.field(g,[x0+3,y0+3,x1-3,y1-3],()=>VG.hsl(R(70,110),R(30,50),R(93,99),.95),()=>-.15,{rnd,len:[6,12],wid:[2.5,4.5],dens:3.2,aj:.3});
    for(let pass=0;pass<2;pass++){
      const a=pass?Math.floor(N*.03):0, b=pass?N:Math.floor(N*.97), jx=R(-.8,.8), jy=R(-.8,.8);
      for(let i=a;i<b;i++){
        const p=pts[i], q=pts[(i+1)%N], w1=Math.sin(i*.33+ph+pass)*1.3+R(-.5,.5);
        const x=(p[0]+q[0])/2+jx+w1*.6, y=(p[1]+q[1])/2+jy+w1*.6, ang=Math.atan2(q[1]-p[1],q[0]-p[0])+R(-.08,.08);
        VG.stroke(g,x,y,Math.hypot(q[0]-p[0],q[1]-p[1])*1.5+2,R(1.2,2.3),ang,VG.hsl(h+R(-8,8),sat,l+R(-6,10),R(.6,.9)),R(-.1,.1));
      }
    }
  };
})();
