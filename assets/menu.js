/* Shared page behaviour (the hamburger menu has been removed):
   - slow fade in / out between pages
   - on phones, asks for landscape and covers the page with a "turn your phone" screen when held upright
   Add <script src="assets/menu.js"></script> in the <head>. */
(function(){
  const MONO='ui-monospace,Menlo,Consolas,"Courier New",monospace';
  const css=document.createElement('style');
  css.textContent=`
  @keyframes pgin{from{opacity:0}to{opacity:1}}
  html{animation:pgin 1.4s ease backwards}
  html.leaving{opacity:0;transition:opacity .9s ease}
  #rot{display:none;position:fixed;inset:0;z-index:100000;flex-direction:column;align-items:center;justify-content:center;gap:28px;background:radial-gradient(ellipse at 50% 45%,#e8f5e8,#c6e2cb);color:#2c4733;font-family:${MONO};font-size:13px;letter-spacing:.26em;text-align:center;padding:0 30px}
  #rot i{display:block;width:46px;height:76px;border:2px solid #2c4733;border-radius:9px;animation:turn 4s ease-in-out infinite}
  @keyframes turn{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
  @media (orientation:portrait) and (pointer:coarse){#rot{display:flex}}`;
  document.head.appendChild(css);

  function build(){
    const rot=document.createElement('div'); rot.id='rot'; rot.innerHTML='<i></i><div>please turn your phone sideways</div>'; document.body.appendChild(rot);
  }
  if(document.body) build(); else document.addEventListener('DOMContentLoaded',build);

  /* ask the browser to hold landscape. Android Chrome only allows this in fullscreen, so the first tap goes fullscreen and then locks.
     iPhones refuse both, so the overlay above is the fallback there. */
  const lock=()=>{ try{ screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} };
  lock();
  document.addEventListener('click',()=>{
    const el=document.documentElement, fs=el.requestFullscreen||el.webkitRequestFullscreen;
    if(fs&&!document.fullscreenElement){ try{ Promise.resolve(fs.call(el)).then(lock,lock); }catch(e){ lock(); } } else lock();
  },{once:true});

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
