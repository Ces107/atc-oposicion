(function(){
'use strict';
var ROOT=(document.body&&document.body.dataset.root)||'';
var items=null,filtered=[],sel=0,open_=false,lastFocus=null;
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function esc(s){return (s||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
function ensureUI(){
  if(document.getElementById('cmdk-overlay'))return;
  var ov=document.createElement('div');ov.id='cmdk-overlay';ov.className='cmdk-overlay';
  ov.innerHTML='<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Buscar">'
    +'<input type="text" id="cmdk-input" class="cmdk-input" placeholder="Buscar" aria-label="Buscar" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list">'
    +'<div id="cmdk-list" class="cmdk-list" role="listbox" aria-label="Resultados"></div>'
    +'</div>';
  document.body.appendChild(ov);
  ov.addEventListener('mousedown',function(e){if(e.target===ov)close()});
  var inp=document.getElementById('cmdk-input');
  inp.addEventListener('input',onInput);
  inp.addEventListener('keydown',onKey);
}
function render(){
  var list=document.getElementById('cmdk-list');
  if(!filtered.length){list.innerHTML='<div class="cmdk-empty">Sin resultados</div>';return}
  list.innerHTML=filtered.slice(0,40).map(function(it,i){
    return '<div class="cmdk-item'+(i===sel?' sel':'')+'" role="option" id="cmdk-o'+i+'" aria-selected="'+(i===sel)+'" data-i="'+i+'"><span class="cmdk-t">'+esc(it.title)+'</span><span class="cmdk-s">'+esc(it.section||'')+'</span></div>';
  }).join('');
  Array.prototype.forEach.call(list.children,function(el){
    el.addEventListener('mousemove',function(){var i=+el.getAttribute('data-i');if(i!==sel)mark(i,false)});
    el.addEventListener('mousedown',function(e){e.preventDefault();go(filtered[+el.getAttribute('data-i')])});
  });
  mark(sel,true);
}
function mark(i,scroll){
  var list=document.getElementById('cmdk-list'),inp=document.getElementById('cmdk-input');
  var old=list.children[sel];if(old){old.classList.remove('sel');old.setAttribute('aria-selected','false')}
  sel=i;var el=list.children[sel];
  if(el){el.classList.add('sel');el.setAttribute('aria-selected','true');inp.setAttribute('aria-activedescendant',el.id);if(scroll&&el.scrollIntoView)el.scrollIntoView({block:'nearest'})}
  else inp.removeAttribute('aria-activedescendant');
}
function rank(it,toks,q){
  var t=norm(it.title),s=norm(it.section),score=0;
  for(var k=0;k<toks.length;k++){
    var w=toks[k],ti=t.indexOf(w);
    if(ti>=0){score+=(ti===0||t.charAt(ti-1)===' '||t.charAt(ti-1)===':')?1:2}
    else if(s.indexOf(w)>=0)score+=4;
    else return -1;
  }
  if(t===q)return 0;
  var c=t.indexOf(': ');
  if(c>0&&t.slice(c+2)===q)return it.section==='Temario'?0.4:0.5;
  if(t.indexOf(q)===0)return 1;
  return 2+score;
}
function applyFilter(){
  if(!items){filtered=[];sel=0;render();return}
  var q=norm(document.getElementById('cmdk-input').value);
  q=q.replace(/\s+/g,' ').trim();
  if(!q){filtered=items.filter(function(it){return it.section==='Temario'||it.section==='Aparte del temario'}).slice(0,40)}
  else{
    var toks=q.split(' '),sc=[];
    items.forEach(function(it,i){var r=rank(it,toks,q);if(r>=0)sc.push([r,i,it])});
    sc.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});
    filtered=sc.map(function(x){return x[2]});
  }
  sel=0;render();
}
function onInput(){applyFilter()}
function onKey(e){
  if(e.key==='Escape'){e.preventDefault();close();return}
  if(e.key==='Tab'){e.preventDefault();return}
  if(e.key==='ArrowDown'){e.preventDefault();mark(Math.min(sel+1,Math.min(filtered.length,40)-1),true);return}
  if(e.key==='ArrowUp'){e.preventDefault();mark(Math.max(sel-1,0),true);return}
  if(e.key==='Enter'){e.preventDefault();if(filtered[sel])go(filtered[sel]);return}
}
function go(it){if(it)location.href=ROOT+it.path}
function openPalette(){
  ensureUI();
  lastFocus=document.activeElement;
  document.getElementById('cmdk-overlay').classList.add('open');open_=true;
  var inp=document.getElementById('cmdk-input');inp.value='';inp.focus();
  applyFilter();
  if(!items)fetch(ROOT+'search-index.json').then(function(r){return r.json()}).then(function(d){items=d;applyFilter()}).catch(function(){items=[];applyFilter()});
}
function close(){var ov=document.getElementById('cmdk-overlay');if(ov)ov.classList.remove('open');open_=false;if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&(e.key==='k'||e.key==='K')){e.preventDefault();open_?close():openPalette()}
});
window.__atcSearchOpen=openPalette;

var hd=document.querySelector('header.top');
if(hd){
  var hh=function(){document.documentElement.style.setProperty('--hh',hd.offsetHeight+'px')};
  hh();
  if('ResizeObserver' in window)new ResizeObserver(hh).observe(hd);else addEventListener('resize',hh);
}

// paginas pedidas por adelantado: Chrome usa las speculation rules del <head> (hover o pulsacion); el resto, un
// prefetch al pulsar o tras 80 ms de hover. Solo paginas del sitio, nunca descargas.
var specOk=false;try{specOk=HTMLScriptElement.supports&&HTMLScriptElement.supports('speculationrules')}catch(e){}
if(!specOk&&location.protocol!=='file:'){
  var done={},tmr=null;
  var pf=function(a){
    if(!a||a.target||a.hasAttribute('download')||a.origin!==location.origin)return;
    if(!/(\.html|\/)$/.test(a.pathname))return;
    var u=a.href.split('#')[0];if(done[u]||u===location.href.split('#')[0])return;done[u]=1;
    var l=document.createElement('link');
    if(l.relList&&l.relList.supports&&l.relList.supports('prefetch')){l.rel='prefetch';l.href=u;document.head.appendChild(l)}
    else{try{fetch(u,{credentials:'same-origin'}).catch(function(){})}catch(e){}}
  };
  var near=function(e){return e.target&&e.target.closest?e.target.closest('a[href]'):null};
  document.addEventListener('pointerdown',function(e){pf(near(e))},{passive:true,capture:true});
  document.addEventListener('mouseover',function(e){var a=near(e);clearTimeout(tmr);if(a)tmr=setTimeout(function(){pf(a)},80)},{passive:true});
}
})();
