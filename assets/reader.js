(function(){
'use strict';
var main=document.getElementById('main');if(!main)return;
var PAGE=main.getAttribute('data-read');if(!PAGE)return;
var KEY='atc_read_v1',MAXP=200,D=document,W=window;
var toc=D.getElementById('toc'),btn=D.getElementById('toc-btn'),rp=D.getElementById('rp'),hd=D.querySelector('header.top');
function hh(){return hd?hd.getBoundingClientRect().height:0}
function lsGet(){try{var o=JSON.parse(localStorage.getItem(KEY)||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch(e){return {}}}
function lsSet(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
var links=[],heads=[];
if(toc)Array.prototype.forEach.call(toc.querySelectorAll('a[href^="#"]'),function(a){
  var id;try{id=decodeURIComponent(a.getAttribute('href').slice(1))}catch(e){return}
  var el=D.getElementById(id);if(el){links.push(a);heads.push(el)}});
var N=heads.length,read=[],i;for(i=0;i<N;i++)read.push(0);
function absTop(el){return el.getBoundingClientRect().top+W.pageYOffset}
function docEnd(){return D.documentElement.scrollHeight}
function cur_(line){var lo=0,hi=N-1,a=-1;while(lo<=hi){var m=(lo+hi)>>1;if(heads[m].getBoundingClientRect().top<=line){a=m;lo=m+1}else hi=m-1}return a}
function span(s){return [s<0?0:absTop(heads[s]),s+1<N?absTop(heads[s+1]):docEnd()]}
function toHex(){var s='';for(var i=0;i<N;i+=4){var v=0;for(var j=0;j<4;j++)if(read[i+j])v|=1<<j;s+=v.toString(16)}return s.replace(/0+$/,'')}
function fromHex(s){if(typeof s!=='string')return;for(var i=0;i<s.length;i++){var v=parseInt(s.charAt(i),16);if(isNaN(v))continue;for(var j=0;j<4;j++)if((v&(1<<j))&&i*4+j<N)read[i*4+j]=1}}
function paint(){for(var i=0;i<N;i++)links[i].classList.toggle('rd',!!read[i])}
var saved=lsGet()[PAGE];saved=Array.isArray(saved)&&saved.length>=2?saved:null;
if(saved)fromHex(saved[2]);paint();

/* volver a donde se dejo: solo en una visita nueva (recarga y atras ya los restaura el navegador) y sin #ancla */
function target(e){var s=+e[0],f=+e[1]||0;if(!(s>=-1&&s<N))return null;var p=span(s);return Math.max(0,p[0]+f*(p[1]-p[0])-hh())}
var nv=(W.performance&&performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{};
if(saved&&!location.hash&&nv.type!=='reload'&&nv.type!=='back_forward'){
  var y0=target(saved);
  if(y0!==null&&y0>innerHeight*.5){
    var moved=false,mark=function(){moved=true};
    ['wheel','touchstart','keydown','pointerdown'].forEach(function(ev){addEventListener(ev,mark,{passive:true,once:true})});
    W.scrollTo({top:y0,left:0,behavior:'instant'});
    addEventListener('load',function(){if(!moved){var y=target(saved);if(y!==null)W.scrollTo({top:y,left:0,behavior:'instant'})}});
  }
}

/* seccion actual y secciones leidas: una seccion cuenta como leida al pasar a la siguiente tras un tiempo minimo
   proporcional a su altura (3 s por pantalla, de 2 a 30 s); las secciones cortas (un titulo con poco o nada debajo,
   p. ej. un h2 seguido de su primer h3) se marcan con la siguiente; saltar con el indice no marca nada */
var cur=-2,since=Date.now(),tmr=null;
function need(s){var p=span(s);return Math.min(30000,Math.max(2000,3000*(p[1]-p[0])/innerHeight))}
function isShort(s){var p=span(s);return p[1]-p[0]<innerHeight*.3}
function keep(a){if(!toc||!a||toc.scrollHeight<=toc.clientHeight)return;var t=a.offsetTop,b=t+a.offsetHeight;
  if(t<toc.scrollTop+24||b>toc.scrollTop+toc.clientHeight-24)toc.scrollTop=Math.max(0,t-toc.clientHeight/3)}
function markRead(s){if(s<0||s>=N)return;var k;
  if(!read[s]){read[s]=1;links[s].classList.add('rd')}
  for(k=s-1;k>=0&&!read[k]&&isShort(k);k--){read[k]=1;links[k].classList.add('rd')}}
function update(){
  var c=cur_(innerHeight*.4);if(c===cur)return;
  var now=Date.now(),k,seq=cur>=0&&c>cur;
  for(k=cur+1;seq&&k<c;k++)if(!isShort(k))seq=false;
  if(seq&&now-since>=need(cur)){markRead(cur);for(k=cur+1;k<c;k++)markRead(k)}
  if(cur>=0&&links[cur])links[cur].classList.remove('active');
  cur=c;since=now;
  if(c>=0){links[c].classList.add('active');keep(links[c])}
  later();
}
function later(){clearTimeout(tmr);tmr=setTimeout(save,1500)}
function save(){
  clearTimeout(tmr);
  var line=hh(),c=cur_(line+8),p=span(c),L=W.pageYOffset+line;
  var f=p[1]>p[0]?Math.min(1,Math.max(0,(L-p[0])/(p[1]-p[0]))):0;
  var o=lsGet(),prev=o[PAGE];if(Array.isArray(prev))fromHex(prev[2]);
  var e=[c,Math.round(f*1000)/1000,toHex(),Math.floor(Date.now()/1000)];
  if(Array.isArray(prev)&&prev[0]===e[0]&&prev[1]===e[1]&&prev[2]===e[2])return;
  o[PAGE]=e;
  var ks=Object.keys(o);
  if(ks.length>MAXP){ks.sort(function(a,b){return ((o[a]||[])[3]||0)-((o[b]||[])[3]||0)});ks.slice(0,ks.length-MAXP).forEach(function(k){if(k!==PAGE)delete o[k]})}
  lsSet(o);paint();
}
if('IntersectionObserver' in W){
  if(N){var io=new IntersectionObserver(update,{rootMargin:'0px 0px -60% 0px'});heads.forEach(function(h){io.observe(h)})}
  var end=D.createElement('div');end.setAttribute('aria-hidden','true');main.appendChild(end);
  new IntersectionObserver(function(en){if(en[0].isIntersecting){update();if(cur===N-1&&Date.now()-since>=need(cur))markRead(cur);later()}}).observe(end);
}
if(N)update();
if('onscrollend' in W)addEventListener('scrollend',function(){update();later()},{passive:true});
D.addEventListener('visibilitychange',function(){if(D.visibilityState==='hidden')save()});
addEventListener('pagehide',save);

/* barra de progreso: CSS (animation-timeline) donde exista; si no, rAF con scroll pasivo */
if(rp&&!(W.CSS&&CSS.supports&&CSS.supports('animation-timeline:scroll()'))){
  var tick=false,upd=function(){var h=D.documentElement,d=h.scrollHeight-h.clientHeight;rp.style.transform='scaleX('+(d>0?Math.min(1,Math.max(0,h.scrollTop/d)):0)+')';tick=false};
  D.addEventListener('scroll',function(){if(!tick){requestAnimationFrame(upd);tick=true}},{passive:true});upd();
}

/* indice desde la cabecera (movil y tableta); en escritorio va fijo a la izquierda */
if(btn&&toc){
  var isOpen=function(){return D.body.classList.contains('toc-open')};
  var setOpen=function(v){D.body.classList.toggle('toc-open',v);btn.setAttribute('aria-expanded',v?'true':'false');
    if(v){var a=links[cur>=0?cur:0];toc.scrollTop=a?Math.max(0,a.offsetTop-toc.clientHeight/3):0}};
  btn.addEventListener('click',function(e){e.stopPropagation();setOpen(!isOpen())});
  toc.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('a'))setOpen(false)});
  D.addEventListener('click',function(e){if(isOpen()&&!toc.contains(e.target)&&!btn.contains(e.target))setOpen(false)});
  D.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen()){setOpen(false);btn.focus()}});
  var mq=W.matchMedia&&matchMedia('(min-width:901px)');if(mq&&mq.addEventListener)mq.addEventListener('change',function(){if(mq.matches)setOpen(false)});
}
W.__atcRead={save:save,state:function(){return {cur:cur,read:read.slice(),n:N}}};
})();
