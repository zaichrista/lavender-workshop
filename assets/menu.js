/* Three-line menu, top right. Add <script src="assets/menu.js"></script> to any page.
   The lines take whichever colour reads against what's behind them (samples canvas#main if there is one). */
(function(){
  const LINKS=[['gifts','gifts.html'],['meet croc','game.html'],['home','home.html']];
  const css=document.createElement('style');
  css.textContent=`
  #hm{--c:#3b4a3f;--bg:rgba(255,255,255,.35);position:fixed;top:max(14px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));z-index:9999;font-family:ui-monospace,Menlo,Consolas,"Courier New",monospace}
  #hm button{width:34px;height:30px;border:0;background:none;cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px}
  #hm button i{display:block;width:24px;height:2px;border-radius:2px;background:var(--c);transition:background .6s,transform .2s,opacity .2s}
  #hm.open button i:nth-child(1){transform:translateY(8px) rotate(45deg)}
  #hm.open button i:nth-child(2){opacity:0}
  #hm.open button i:nth-child(3){transform:translateY(-8px) rotate(-45deg)}
  #hm nav{position:absolute;top:40px;right:0;min-width:140px;padding:8px 6px;border-radius:10px;background:var(--bg);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:none;flex-direction:column;transition:background .6s}
  #hm.open nav{display:flex}
  #hm nav a{padding:8px 12px;color:var(--c);text-decoration:none;font-size:13px;letter-spacing:.08em;text-align:right;transition:color .6s}
  #hm nav a:hover,#hm nav a.here{text-decoration:underline;text-underline-offset:4px}`;
  document.head.appendChild(css);
  const here=location.pathname.split('/').pop()||'index.html';
  const box=document.createElement('div'); box.id='hm';
  box.innerHTML='<button aria-label="menu" aria-expanded="false"><i></i><i></i><i></i></button><nav>'+
    LINKS.map(([t,h])=>`<a href="${h}"${h===here?' class="here"':''}>${t}</a>`).join('')+'</nav>';
  document.body.appendChild(box);
  const btn=box.querySelector('button');
  btn.onclick=e=>{ e.stopPropagation(); const o=box.classList.toggle('open'); btn.setAttribute('aria-expanded',o); };
  document.addEventListener('click',e=>{ if(!box.contains(e.target)){ box.classList.remove('open'); btn.setAttribute('aria-expanded',false); } });

  /* pick ink colour from the scene behind the button */
  const probe=document.createElement('canvas'); probe.width=probe.height=1;
  const pg=probe.getContext('2d',{willReadFrequently:true});
  function lum(){
    const src=document.getElementById('main');
    if(src&&src.getContext){
      try{
        const r=src.getBoundingClientRect(), s=Math.max(r.width/src.width,r.height/src.height);
        const px=r.width-30-(r.width-src.width*s)/2, py=24-(r.height-src.height*s)/2, n=28/s;
        pg.drawImage(src,px/s-n/2,py/s-n/2,n,n,0,0,1,1);
        const d=pg.getImageData(0,0,1,1).data; return (.299*d[0]+.587*d[1]+.114*d[2])/255;
      }catch(e){}
    }
    const m=getComputedStyle(document.body).backgroundColor.match(/\d+/g);
    return m?(.299*m[0]+.587*m[1]+.114*m[2])/255:1;
  }
  function tick(){
    const light=lum()>.5;
    box.style.setProperty('--c',light?'#2a2433':'#f3ecfa');
    box.style.setProperty('--bg',light?'rgba(255,255,255,.3)':'rgba(20,16,28,.3)');
  }
  tick(); setInterval(tick,600);
})();
