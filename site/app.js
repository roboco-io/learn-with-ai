import { slides } from './content.js';
const $ = (s) => document.querySelector(s);
const cleanTitle = (s) => s.replace(/<br\s*\/?\s*>/g, ' ').replace(/<[^>]*>/g, '');
$('#deck').innerHTML = slides.map((s, i) => `<section class="slide ${s.kind}" id="slide-${i+1}" aria-label="${i+1}. ${cleanTitle(s.title)}" ${i ? 'hidden' : ''}><${i ? 'h2' : 'h1'}>${s.title}</${i ? 'h2' : 'h1'}><div class="slide-content">${s.body}</div><div class="slide-sources">${s.refs.map(([title,url]) => `<a href="${url}" target="_blank" rel="noopener">${title} ↗</a>`).join('')}</div></section>`).join('');
$('#outline-list').innerHTML = slides.map((s,i)=>`<li><button data-slide="${i}">${String(i+1).padStart(2,'0')} &nbsp; ${cleanTitle(s.title)}<small>${s.chapter}</small></button></li>`).join('');
const sections = [...document.querySelectorAll('.slide')];
let current = 0;
function fromHash() {const n = Number(location.hash.slice(1)); return Number.isInteger(n) && n >= 1 && n <= slides.length ? n-1 : 0;}
function go(index, update = true) {
 current = Math.max(0, Math.min(slides.length-1, index));
 sections.forEach((el,i)=>{el.hidden=i!==current;});
 const s = slides[current];
 $('#counter').textContent = `${String(current+1).padStart(2,'0')} / ${slides.length}`;
 $('#chapter').textContent = s.chapter;
 $('#prev').disabled = current === 0; $('#next').disabled = current === slides.length-1;
 $('#progress-fill').style.width = `${(current+1)/slides.length*100}%`;
 $('.progress').setAttribute('aria-valuemax',slides.length);
 $('.progress').setAttribute('aria-valuenow',current+1);
 $('#notes-text').textContent=s.notes;
 const elapsed=slides.slice(0,current).reduce((a,s)=>a+s.minutes,0);
 $('#timing').textContent=s.minutes ? `권장 ${s.minutes}분 · ${elapsed}–${elapsed+s.minutes}분 구간` : '부록 · 필요할 때 참고';
 document.querySelectorAll('[data-slide]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.slide)===current));
 document.title=current ? `${cleanTitle(s.title)} | AI 시대의 학습법` : 'AI 시대의 학습법 | ROBOCO';
 if(update) location.hash=String(current+1);
}
window.addEventListener('hashchange',()=>go(fromHash(),false));
$('#prev').onclick=()=>go(current-1); $('#next').onclick=()=>go(current+1);
function toggleNotes(force) {const open=force??$('#notes').hidden; $('#notes').hidden=!open; $('#notes-toggle').setAttribute('aria-expanded',open); if(!open && document.activeElement === $('#notes-close')) $('#notes-toggle').focus();}
$('#notes-toggle').onclick=()=>toggleNotes(); $('#notes-close').onclick=()=>toggleNotes(false);
function showOutline() {$('#outline').showModal(); $('#outline-list [aria-current="true"]').scrollIntoView({block:'center'});}
$('#overview').onclick=showOutline;
$('#outline-close').onclick=()=>$('#outline').close();
$('#outline-list').onclick=e=>{const b=e.target.closest('[data-slide]');if(b){go(Number(b.dataset.slide));$('#outline').close();}};
async function fullscreen(){try{if(document.fullscreenElement) await document.exitFullscreen();else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();else $('#status').textContent='이 브라우저는 전체화면 API를 지원하지 않습니다.';}catch{$('#status').textContent='전체화면을 시작할 수 없습니다. 브라우저의 전체화면 메뉴를 사용해 주세요.';}}
$('#fullscreen').onclick=fullscreen;
$('#print').onclick=()=>window.print();
document.addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable]')||$('#outline').open) return;
 if(e.target.closest('button,a,[role="button"]') && ['Enter',' '].includes(e.key)) return;
 const k=e.key.toLowerCase();
 if(['arrowright','pagedown',' '].includes(k)){e.preventDefault();go(current+1);}
 else if(['arrowleft','pageup'].includes(k)){e.preventDefault();go(current-1);}
 else if(k==='home'){e.preventDefault();go(0);}
 else if(k==='end'){e.preventDefault();go(slides.length-1);}
 else if(k==='o')showOutline();else if(k==='n')toggleNotes();else if(k==='f')fullscreen();else if(k==='escape')toggleNotes(false);
});
let touch=null;
$('#deck').addEventListener('touchstart',e=>{if(e.target.closest('a,button,svg'))return;touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
$('#deck').addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*2)go(current+(dx<0?1:-1));touch=null;},{passive:true});
go(fromHash(),false);
let data, scale='log';
const ns='http://www.w3.org/2000/svg';
function svgNode(name,attrs,text){const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;return el;}
function duration(m){return m<1?`${(m*60).toFixed(1)}초`:m<60?`${m.toFixed(1)}분`:`${(m/60).toFixed(1)}시간`;}
function drawChart(){
 const W=1000,H=320,L=76,R=34,T=13,B=38, max=4320,min=.006;
 const start=Date.UTC(2019,0,1),end=Date.UTC(2026,8,1);
 const x=d=>L+(Date.parse(d)-start)/(end-start)*(W-L-R);
 const y=v=>H-B-(scale==='log'?(Math.log(Math.max(v,min))-Math.log(min))/(Math.log(max)-Math.log(min)):v/max)*(H-T-B);
 const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'group','aria-label':`METR 50% 성공 과제 길이, ${scale==='log'?'로그':'선형'} 축. 점에 포커스하거나 클릭해 상세 확인.`});
 svg.append(svgNode('title',{},'METR TH 1.1 · 50% 성공 시간 지평'));
 const ticks=scale==='log'?[1/60,1,60,480,4320]:[0,720,1440,2160,2880,3600,4320];
 ticks.forEach(v=>{const yy=y(v);svg.append(svgNode('line',{x1:L,x2:W-R,y1:yy,y2:yy,stroke:'#d4ddef'}),svgNode('text',{x:L-10,y:yy+4,'text-anchor':'end'},v===0?'0':duration(v).replace('.0','')));});
 for(let yr=2019;yr<=2026;yr++){const xx=x(`${yr}-01-01`);svg.append(svgNode('text',{x:xx,y:H-9,'text-anchor':'middle'},yr));}
 const lineY=y(960);
 svg.append(svgNode('line',{x1:L,x2:W-R,y1:lineY,y2:lineY,stroke:'#b36817','stroke-dasharray':'5 5'}));
 svg.append(svgNode('text',{x:L+5,y:lineY-6,style:'fill:#9b5a10;font-size:12px'},'16시간 · 이 이상 추정은 신뢰도가 낮음'));
 data.models.forEach(m=>{
  const xx=x(m.date),yy=y(m.estimate);
  svg.append(svgNode('line',{x1:xx,x2:xx,y1:y(m.ci_low),y2:y(m.ci_high),class:'ci'}));
  const label=`${m.name} · ${m.date} · ${duration(m.estimate)} · 95% 신뢰구간 ${duration(m.ci_low)}–${duration(m.ci_high)}`;
  const p=svgNode('circle',{cx:xx,cy:yy,r:5.5,class:`point${m.estimate>960?' unreliable':''}`,tabindex:0,role:'button','aria-label':label});
  p.append(svgNode('title',{},label));
  const show=()=>{$('#chart-detail').textContent=label;};
  p.addEventListener('focus',show);p.addEventListener('mouseenter',show);p.addEventListener('click',show);p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
  svg.append(p);
 });
 $('#metr-chart').replaceChildren(svg);
}
document.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>{scale=b.dataset.scale;document.querySelectorAll('[data-scale]').forEach(el=>el.setAttribute('aria-pressed',el===b));if(data)drawChart();});
try {const response=await fetch('./data/metr.json');if(!response.ok)throw new Error('data');data=await response.json();drawChart();}catch{$('#metr-chart').innerHTML='<p>그래프 데이터를 불러오지 못했습니다. <a href="https://metr.org/time-horizons/">METR 공식 그래프 보기</a></p>';}
