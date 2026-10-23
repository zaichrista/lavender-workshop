/* Three-line menu, top right + slow page fades. Add <script src="assets/menu.js"></script> in the <head>.
   The lines take whichever colour reads against what's behind them (samples canvas#main if there is one). */
(function(){
  const MONO='ui-monospace,Menlo,Consolas,"Courier New",monospace';
  const LINKS=[['gifts','gifts.html'],['meet croc','index.html']];
  const css=document.createElement('style');
  css.textContent=`
  @keyframes pgin{from{opacity:0}to{opacity:1}}
  html{animation:pgin 1.4s ease backwards}
  html.leaving{opacity:0;transition:opacity .9s ease}
  #hm{--c:#3b4a3f;--bg:rgba(255,255,255,.35);position:fixed;top:max(14px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));z-index:9999;font-family:${MONO}}
  #hm button{width:34px;height:30px;border:0;background:none;cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px}
  #hm button i{display:block;width:24px;height:2px;border-radius:2px;background:var(--c);transition:background 1s ease,transform .6s ease,opacity .6s ease}
  #hm.open button i:nth-child(1){transform:translateY(8px) rotate(45deg)}
  #hm.open button i:nth-child(2){opacity:0}
  #hm.open button i:nth-child(3){transform:translateY(-8px) rotate(-45deg)}
  #hm nav{position:absolute;top:40px;right:0;min-width:140px;padding:8px 6px;border-radius:10px;background:var(--bg);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;flex-direction:column;opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .7s ease,transform .7s ease,visibility 0s .7s,background 1s ease}
  #hm.open nav{opacity:1;visibility:visible;transform:none;transition:opacity .7s ease,transform .7s ease,background 1s ease}
  #hm nav a{padding:8px 12px;color:var(--c);text-decoration:none;font-size:13px;letter-spacing:.08em;text-align:right;transition:color 1s ease,opacity .6s ease;opacity:.85}
  #hm nav a:hover,#hm nav a.here{opacity:1;text-decoration:underline;text-underline-offset:4px}`;
  css.textContent+=`
  #rot{display:none;position:fixed;inset:0;z-index:100000;flex-direction:column;align-items:center;justify-content:center;gap:28px;background:radial-gradient(ellipse at 50% 45%,#e8f5e8,#c6e2cb);color:#2c4733;font-family:${MONO};font-size:13px;letter-spacing:.26em;text-align:center;padding:0 30px}
  #rot i{display:block;width:46px;height:76px;border:2px solid #2c4733;border-radius:9px;animation:turn 4s ease-in-out infinite}
  @keyframes turn{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
  @media (orientation:portrait) and (pointer:coarse){#rot{display:flex}}`;
  document.head.appendChild(css);

  function build(){
    const rot=document.createElement('div'); rot.id='rot'; rot.innerHTML='<i></i><div>please turn your phone sideways</div>'; document.body.appendChild(rot);
    const here=location.pathname.split('/').pop()||'index.html';
    const box=document.createElement('div'); box.id='hm';
    box.innerHTML='<button aria-label="menu" aria-expanded="false"><i></i><i></i><i></i></button><nav>'+
      LINKS.map(([t,h])=>`<a href="${h}"${h===here?' class="here"':''}>${t}</a>`).join('')+'</nav>';
    document.body.appendChild(box);
    const btn=box.querySelector('button');
    btn.onclick=e=>{ e.stopPropagation(); const o=box.classList.toggle('open'); btn.setAttribute('aria-expanded',o); };
    document.addEventListener('click',e=>{ if(!box.contains(e.target)){ box.classList.remove('open'); btn.setAttribute('aria-expanded',false); } });

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
    tick(); setInterval(tick,900);
  }
  if(document.body) build(); else document.addEventListener('DOMContentLoaded',build);

  /* ask the browser to hold landscape (only some phones allow it, and only in fullscreen); the overlay above does the rest */
  const lock=()=>{ try{ screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} };
  lock(); document.addEventListener('click',lock,{once:true});

  /* slow fade out before moving to another page */
  document.addEventListener('click',e=>{
    const a=e.target.closest&&e.target.closest('a[href]');
    if(!a||a.target||e.metaKey||e.ctrlKey||e.shiftKey||a.origin!==location.origin) return;
    if(a.pathname===location.pathname) return;
    e.preventDefault(); document.documentElement.classList.add('leaving');
    setTimeout(()=>{ location.href=a.href; },850);
  });
  addEventListener('pageshow',e=>{ if(e.persisted) document.documentElement.classList.remove('leaving'); });
})();
