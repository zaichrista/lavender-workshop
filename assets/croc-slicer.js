/* =====================================================================
   Cuts the crocodile sprite sheet (assets/croc-sheet.webp, embedded as
   assets/croc-sheet.js) into individual transparent frames, in the browser.

   1. Everything that isn't white is "paint".
   2. Touching paint is grouped into blobs. Big blobs = a crocodile.
      Flat wide blobs = the lilac label pills (thrown away).
      Small blobs (zzz, hearts, petals, lavender) join the nearest crocodile.
   3. Blobs that are really 2–3 crocodiles touching are split along a curved "seam" that
      threads through the whitest path between them (like seam carving).
   4. Each crocodile is sorted into its animation by where it sits on the sheet.
   ===================================================================== */
(function(){
  const GROUPS=[ // [row, name, xMin, xMax]  (centre of the crocodile decides which group)
    [0,'idle',0,545],[0,'walkR',545,1015],[0,'walkL',1015,1500],
    [1,'talk',0,555],[1,'happy',555,1085],[1,'sit',1085,1500],
    [2,'sleep',0,790],[2,'hurt',790,1500],
    [3,'pickup',0,525],[3,'hold',525,1035],[3,'place',1035,1500],
    [4,'cut',0,530],[4,'tie',530,1000],[4,'sort',1000,1500]];
  const ROW_Y=[228,430,610,790];
  const rowOf=y=>y<ROW_Y[0]?0:y<ROW_Y[1]?1:y<ROW_Y[2]?2:y<ROW_Y[3]?3:4;

  window.sliceCrocSheet=function(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('crocodile sheet failed to load'));
      img.onload=()=>{
        const W=img.naturalWidth,H=img.naturalHeight, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
        const g=cv.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0);
        const px=g.getImageData(0,0,W,H).data;
        const minc=p=>Math.min(px[p*4],px[p*4+1],px[p*4+2]);
        const mask=new Uint8Array(W*H);
        for(let i=0;i<W*H;i++) mask[i]=(minc(i)<240&&px[i*4+3]>10)?1:0;
        // connected blobs (8-neighbour)
        const lab=new Int32Array(W*H), blobs=[]; const stack=new Int32Array(W*H);
        for(let s=0;s<W*H;s++){
          if(!mask[s]||lab[s]) continue;
          const id=blobs.length+1; let sp=0; stack[sp++]=s; lab[s]=id; let x0=W,y0=H,x1=0,y1=0,area=0;
          while(sp){ const p=stack[--sp], x=p%W, y=(p/W)|0; area++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
            for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){ const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue; const q=ny*W+nx; if(mask[q]&&!lab[q]){ lab[q]=id; stack[sp++]=q; } } }
          blobs.push({id,x0,y0,x1,y1,area});
        }
        const bw=b=>b.x1-b.x0+1, bh=b=>b.y1-b.y0+1;
        const isPill=b=>bh(b)<=46&&bw(b)>=80;
        const bigRaw=blobs.filter(b=>b.area>=4500&&!isPill(b));
        const small=blobs.filter(b=>b.area<4500&&b.area>=12&&!isPill(b));
        // split blobs that are several crocodiles touching, along curved seams
        const big=[];
        for(const b of bigRaw){
          const w=bw(b), bhh=bh(b), k=Math.max(1,Math.round((w-135)/120)+1);
          if(k<=1){ big.push(b); continue; }
          const n=w*bhh, seams=[];
          const cost=(x,y)=>{ const p=y*W+x; return lab[p]===b.id?(minc(p)<205?4:1):0; };
          for(let j=1;j<k;j++){
            const ideal=b.x0+w*j/k, lo=Math.max(b.x0+30,(ideal-38)|0), hi=Math.min(b.x1-30,(ideal+38)|0), m=hi-lo+1;
            const dp=new Float32Array(bhh*m), back=new Int8Array(bhh*m);
            for(let i=0;i<m;i++) dp[i]=cost(lo+i,b.y0)+Math.abs(lo+i-ideal)*.01;
            for(let r=1;r<bhh;r++)for(let i=0;i<m;i++){ let best=dp[(r-1)*m+i], bi=0;
              if(i>0&&dp[(r-1)*m+i-1]<best){ best=dp[(r-1)*m+i-1]; bi=-1; } if(i<m-1&&dp[(r-1)*m+i+1]<best){ best=dp[(r-1)*m+i+1]; bi=1; }
              dp[r*m+i]=best+cost(lo+i,b.y0+r)+Math.abs(lo+i-ideal)*.01; back[r*m+i]=bi; }
            let bi=0, bv=1e9; for(let i=0;i<m;i++) if(dp[(bhh-1)*m+i]<bv){ bv=dp[(bhh-1)*m+i]; bi=i; }
            const seam=new Float32Array(bhh); for(let r=bhh-1;r>=0;r--){ seam[r]=lo+bi; bi+=back[r*m+bi]; }
            seams.push(seam);
          }
          const owner=new Int8Array(n).fill(-1);
          for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++) if(lab[y*W+x]===b.id){ let j=0; while(j<k-1&&x>=seams[j][y-b.y0]) j++; owner[(y-b.y0)*w+(x-b.x0)]=j; }
          for(let j=0;j<k;j++){ let x0=1e9,y0=1e9,x1=-1,y1=-1,area=0;
            for(let s=0;s<n;s++) if(owner[s]===j){ const x=b.x0+(s%w), y=b.y0+((s/w)|0); area++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
            if(area>0) big.push({id:b.id,x0,y0,x1,y1,area,owner,ownerIdx:j,bx0:b.x0,by0:b.y0,bwid:w}); }
        }
        const gap=(a,b)=>Math.hypot(Math.max(0,a.x0-b.x1,b.x0-a.x1),Math.max(0,a.y0-b.y1,b.y0-a.y1));
        big.forEach(b=>{ b.parts=[b]; });
        for(const s of small){ let best=null,bd=1e9; for(const b of big){ const d=gap(s,b); if(d<bd){bd=d;best=b;} } if(best&&bd<=80) best.parts.push(s); }
        const out={}; for(const gr of GROUPS) out[gr[1]]=[];
        for(const b of big){
          const cx=(b.x0+b.x1)/2, cy=(b.y0+b.y1)/2, row=rowOf(cy), gr=GROUPS.find(q=>q[0]===row&&cx>=q[2]&&cx<q[3]);
          if(!gr) continue;
          let x0=1e9,y0=1e9,x1=-1,y1=-1; for(const p of b.parts){ x0=Math.min(x0,p.x0); y0=Math.min(y0,p.y0); x1=Math.max(x1,p.x1); y1=Math.max(y1,p.y1); }
          x0-=1; y0-=1; x1+=1; y1+=1; const w=x1-x0+1, h=y1-y0+1;
          const fc=document.createElement('canvas'); fc.width=w; fc.height=h; const fg=fc.getContext('2d'), im=fg.createImageData(w,h), d=im.data;
          for(let y=0;y<h;y++)for(let x=0;x<w;x++){ const sx=x0+x, sy=y0+y; if(sx<0||sy<0||sx>=W||sy>=H) continue; const p=sy*W+sx, l=lab[p]; if(!l) continue;
            let ok=false; for(const part of b.parts){ if(part.id!==l) continue; if(!part.owner||part.owner[(sy-part.by0)*part.bwid+(sx-part.bx0)]===part.ownerIdx){ ok=true; break; } }
            if(ok){ const o=(y*w+x)*4; d[o]=px[p*4]; d[o+1]=px[p*4+1]; d[o+2]=px[p*4+2]; d[o+3]=255; } }
          // trim the white fringe left by anti-aliasing, then soften the edge a touch
          for(let pass=0;pass<2;pass++){ const kill=[]; for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){ const o=(y*w+x)*4; if(!d[o+3]) continue;
            const edge=!d[o+7]||!d[o-1]||!d[o+w*4+3]||!d[o-w*4+3]; if(edge&&Math.min(d[o],d[o+1],d[o+2])>228) kill.push(o); } for(const o of kill) d[o+3]=0; }
          for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){ const o=(y*w+x)*4; if(d[o+3]===255&&(!d[o+7]||!d[o-1]||!d[o+w*4+3]||!d[o-w*4+3])) d[o+3]=200; }
          fg.putImageData(im,0,0);
          out[gr[1]].push({cv:fc,w,h,ax:(b.x0+b.x1)/2-x0,ay:b.y1-y0,bodyW:bw(b),bodyH:bh(b),sheetX:x0});
        }
        for(const k in out) if(Array.isArray(out[k])) out[k].sort((a,b)=>a.sheetX-b.sheetX);
        const hs=out.idle.map(f=>f.bodyH).sort((a,b)=>a-b);
        out.__standH=hs.length?hs[hs.length>>1]:140;
        resolve(out);
      };
      img.src=src;
    });
  };
})();
