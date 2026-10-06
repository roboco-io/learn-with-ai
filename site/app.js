import { slides } from './content.js';
import { release } from './release.js';
import { fitExponentialTrend } from './trend.js';
const $ = (s) => document.querySelector(s);
const cleanTitle = (s) => s.replace(/<br\s*\/?\s*>/g, ' ').replace(/<[^>]*>/g, '');
$('#deck').innerHTML = slides.map((s, i) => `<section class="slide ${s.kind}" id="slide-${i+1}" aria-label="${i+1}. ${cleanTitle(s.title)}" ${i ? 'hidden' : ''}><${i ? 'h2' : 'h1'}>${s.title}</${i ? 'h2' : 'h1'}><div class="slide-content">${s.body}</div><div class="slide-sources">${s.refs.map(([title,url]) => `<a href="${url}" target="_blank" rel="noopener">${title} ↗</a>`).join('')}</div><small class="slide-version" aria-label="발표자료 버전">v${release.version}</small></section>`).join('');
$('#outline-list').innerHTML = slides.map((s,i)=>`<li><button data-slide="${i}">${String(i+1).padStart(2,'0')} &nbsp; ${cleanTitle(s.title)}<small>${s.chapter}</small></button></li>`).join('');
const sections = [...document.querySelectorAll('.slide')];
let current = 0;
let data, scale='log', chartFrame=0, finishChartAnimation=null;
function fromHash() {const n = Number(location.hash.slice(1)); return Number.isInteger(n) && n >= 1 && n <= slides.length ? n-1 : 0;}
function go(index, update = true) {
 const previous=current;
 current = Math.max(0, Math.min(slides.length-1, index));
 sections.forEach((el,i)=>{el.hidden=i!==current;});
 if(previous!==current && sections[current].querySelector('.pace-reveal'))setPaceStep(0);
 if(previous!==current && sections[current].classList.contains('chart-slide'))setChartScale('log',false);
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
function setPaceStep(step) {
 const reveal=sections[current].querySelector('.pace-reveal');
 if(!reveal)return;
 reveal.dataset.step=step;
 reveal.querySelectorAll('[data-stage]').forEach(el=>{
  const stage=Number(el.dataset.stage);
  el.classList.toggle('is-shown',stage<=step);
  el.classList.toggle('is-past',el.classList.contains('pace-term') && stage<step);
  el.setAttribute('aria-hidden',String(stage>step || el.classList.contains('pace-arrow')));
 });
 const labels=['몇 달','몇 주?','며칠?'];
 reveal.querySelector('.pace-sequence').setAttribute('aria-label',`변화 속도에 대한 질문: ${labels[step]} ${step<2?'클릭하면 다음 표현을 봅니다.':'클릭하면 실제 측정 그래프로 이동합니다.'}`);
 reveal.querySelector('.pace-hint').textContent=`${step+1} / 3 · ${step<2?'클릭·→·Space로 다음 표현':'다음: 실제 측정 그래프'}`;
}
function advance(delta) {
 if(delta>0 && sections[current].classList.contains('chart-slide') && scale==='log'){setChartScale('linear');return;}
 const reveal=sections[current].querySelector('.pace-reveal');
 if(reveal){
  const next=Number(reveal.dataset.step)+delta;
  if(next>=0 && next<=2){setPaceStep(next);return;}
 }
 go(current+delta);
}
$('#prev').onclick=()=>advance(-1); $('#next').onclick=()=>advance(1);
document.querySelectorAll('.pace-sequence').forEach(button=>button.onclick=()=>advance(1));
document.querySelectorAll('.pace-reset').forEach(button=>button.onclick=()=>setPaceStep(0));
function toggleNotes(force) {const open=force??$('#notes').hidden; $('#notes').hidden=!open; $('#notes-toggle').setAttribute('aria-expanded',open); if(!open && document.activeElement === $('#notes-close')) $('#notes-toggle').focus();}
$('#notes-toggle').onclick=()=>toggleNotes(); $('#notes-close').onclick=()=>toggleNotes(false);
function showOutline() {$('#outline').showModal(); $('#outline-list [aria-current="true"]').scrollIntoView({block:'center'});}
$('#overview').onclick=showOutline;
$('#outline-close').onclick=()=>$('#outline').close();
$('#outline-list').onclick=e=>{const b=e.target.closest('[data-slide]');if(b){go(Number(b.dataset.slide));$('#outline').close();}};
let fullscreenBusy=false;
const nativeFullscreen=()=>document.fullscreenElement||document.webkitFullscreenElement;
function setPresentation(active){
 document.body.classList.toggle('presentation',active);
 $('#fullscreen').setAttribute('aria-pressed',String(active));
 $('#presentation-exit').hidden=!active;
 if(active)$('#presentation-exit').focus({preventScroll:true});
 else{ $('#status').classList.remove('visible-status');$('#status').textContent='';$('#fullscreen').focus({preventScroll:true}); }
}
async function leavePresentation(){
 if(fullscreenBusy)return;
 fullscreenBusy=true;
 try{
  if(nativeFullscreen()){
   const exit=document.exitFullscreen||document.webkitExitFullscreen;
   if(exit)await exit.call(document);
  }
  setPresentation(false);
 }catch{
  $('#status').textContent='Esc 키로 브라우저 전체화면을 종료해 주세요.';
  $('#status').classList.add('visible-status');
 }finally{fullscreenBusy=false;}
}
async function fullscreen(){
 if(fullscreenBusy)return;
 if(document.body.classList.contains('presentation')||nativeFullscreen()){await leavePresentation();return;}
 fullscreenBusy=true;
 setPresentation(true);
 try{
  const request=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;
  if(!request)throw new Error('Fullscreen unavailable');
  await request.call(document.documentElement);
 }catch{
  $('#status').textContent='브라우저 전체화면을 사용할 수 없어 창 안에서 확대했습니다. 종료: Esc';
  $('#status').classList.add('visible-status');
 }finally{fullscreenBusy=false;}
}
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>setPresentation(!!nativeFullscreen()));
$('#fullscreen').onclick=fullscreen;
$('#presentation-exit').onclick=leavePresentation;
$('#print').onclick=()=>window.print();
document.addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable]')||$('#outline').open) return;
 if(e.target.closest('button,a,[role="button"]') && ['Enter',' '].includes(e.key)) return;
 const k=e.key.toLowerCase();
 if(e.code==='KeyF'||k==='f'){e.preventDefault();if(!e.repeat)fullscreen();return;}
 if(k==='escape'&&document.body.classList.contains('presentation')){e.preventDefault();leavePresentation();return;}
 if(['arrowright','pagedown',' '].includes(k)){e.preventDefault();advance(1);}
 else if(['arrowleft','pageup'].includes(k)){e.preventDefault();advance(-1);}
 else if(k==='home'){e.preventDefault();go(0);}
 else if(k==='end'){e.preventDefault();go(slides.length-1);}
 else if(k==='o')showOutline();else if(k==='n')toggleNotes();else if(k==='escape')toggleNotes(false);
});
let touch=null;
$('#deck').addEventListener('touchstart',e=>{if(e.target.closest('a,button,svg'))return;touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
$('#deck').addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*2)advance(dx<0?1:-1);touch=null;},{passive:true});
go(fromHash(),false);
// Minute-resolution clock; checking every second keeps it in step with the minute change.
const clockFormat=new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function tick(){const now=new Date();$('#clock').textContent=clockFormat.format(now);$('#clock').dateTime=now.toISOString();}
tick();setInterval(tick,1000);
const ns='http://www.w3.org/2000/svg';
function svgNode(name,attrs,text){const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;return el;}
function duration(m){return m<1?`${(m*60).toFixed(1)}초`:m<60?`${m.toFixed(1)}분`:`${(m/60).toFixed(1)}시간`;}
// Keep the in-flight positions so a quick reversal never jumps to an old scale.
function transitionChart(svg, animate) {
 cancelAnimationFrame(chartFrame);
 const previous=$('#metr-chart svg');
 const motion=animate && previous;
 const tweens=[];
 if(motion){
  const oldNodes=new Map([...previous.querySelectorAll('[data-motion]')].map(el=>[el.dataset.motion,el]));
  for(const el of svg.querySelectorAll('[data-motion]')){
   const old=oldNodes.get(el.dataset.motion);
   if(old){
    for(const attr of ['x','x1','x2','cx','y','y1','y2','cy','height','opacity']){
     if(!el.hasAttribute(attr) && attr!=='opacity')continue;
     const to=Number(el.getAttribute(attr)??1),from=Number(old.getAttribute(attr)??1);
     if(from!==to){el.setAttribute(attr,from);tweens.push({el,attr,from,to});}
    }
    oldNodes.delete(el.dataset.motion);
   }else{el.setAttribute('opacity',0);tweens.push({el,attr:'opacity',from:0,to:1});}
  }
  for(const old of oldNodes.values()){
   const el=old.cloneNode(true);el.setAttribute('aria-hidden','true');el.style.pointerEvents='none';
   svg.append(el);tweens.push({el,attr:'opacity',from:Number(el.getAttribute('opacity')??1),to:0,remove:true});
  }
 }
 $('#metr-chart').replaceChildren(svg);
 const finish=()=>{cancelAnimationFrame(chartFrame);for(const t of tweens){if(t.remove)t.el.remove();else t.el.setAttribute(t.attr,t.to);}svg.removeAttribute('data-animating');finishChartAnimation=null;};
 finishChartAnimation=finish;
 if(!tweens.length){finish();return;}
 svg.dataset.animating='true';
 const start=performance.now();
 function step(now){
  const t=Math.min(1,(now-start)/900),ease=t*t*(3-2*t);
  for(const v of tweens)v.el.setAttribute(v.attr,v.from+(v.to-v.from)*ease);
  if(t<1)chartFrame=requestAnimationFrame(step);else finish();
 }
 chartFrame=requestAnimationFrame(step);
}
window.addEventListener('beforeprint',()=>finishChartAnimation?.());
function drawChart(animate=false){
 const W=1000,H=320,L=76,R=230,T=46,B=38, max=1200,min=.006;
 const start=Date.UTC(2019,0,1),end=Date.UTC(2026,8,1);
 const x=d=>L+(Date.parse(d)-start)/(end-start)*(W-L-R);
 const y=v=>H-B-(scale==='log'?(Math.log(Math.max(v,min))-Math.log(min))/(Math.log(max)-Math.log(min)):v/max)*(H-T-B);
 const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'group','aria-label':`METR 50% 성공 과제 길이, ${scale==='log'?'로그':'선형'} 축. 점에 포커스하거나 클릭해 상세 확인.`});
 svg.append(svgNode('title',{},'METR TH 1.1 · 50% 성공 시간 지평'));
 const lineY=y(960);
 const defs=svgNode('defs',{});
 const hatch=svgNode('pattern',{id:'unreliable-hatch',width:8,height:8,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'});
 hatch.append(svgNode('line',{x1:0,x2:0,y1:0,y2:8,stroke:'#b36817','stroke-opacity':.16,'stroke-width':2}));
 defs.append(hatch);svg.append(defs);
 svg.append(svgNode('rect',{x:L,y:4,width:W-L-R,height:lineY-4,'data-motion':'zone-fill',fill:'#fff5e8'}));
 svg.append(svgNode('rect',{x:L,y:4,width:W-L-R,height:lineY-4,'data-motion':'zone-hatch',fill:'url(#unreliable-hatch)'}));
 const notice=svgNode('text',{x:L+14,y:21,style:'fill:#865012;font-size:13px'});
 notice.append(svgNode('tspan',{x:L+14},'16시간 초과 구간 · 현재 과제 구성으로는'),svgNode('tspan',{x:L+14,dy:16},'측정 신뢰도가 낮음 (METR)'));
 svg.append(notice);
 // Keep both sets of ticks in the SVG: their positions follow the same scale
 // interpolation as the points, while unneeded labels fade out.
 const visibleTicks=scale==='log'?[1/60,1,60,960]:[0,240,480,720,960];
 const ticks=[0,1/60,1,60,240,480,720,960];
 ticks.forEach(v=>{const yy=y(Math.max(scale==='log'?min:0,v)),opacity=visibleTicks.includes(v)?1:0;svg.append(svgNode('line',{x1:L,x2:W-R,y1:yy,y2:yy,opacity,'data-motion':`grid-${v}`,stroke:'#d4ddef'}),svgNode('text',{x:L-10,y:yy+4,opacity,'aria-hidden':opacity===0,'data-motion':`tick-${v}`,'text-anchor':'end'},v===0?'0':duration(v).replace('.0','')));});
 for(let yr=2019;yr<=2026;yr++){const xx=x(`${yr}-01-01`);svg.append(svgNode('text',{x:xx,y:H-9,'text-anchor':'middle'},yr));}
 svg.append(svgNode('line',{x1:L,x2:W-R,y1:lineY,y2:lineY,'data-motion':'threshold',stroke:'#b36817','stroke-dasharray':'5 5'}));
 const trend=fitExponentialTrend(data.models);
 if(trend){
  const group=svgNode('g',{class:'metr-trend',role:'img','aria-label':'2024년 이후 지수 추세선. 16시간 이하 추정치의 로그값을 회귀한 설명용 곡선.'});
  group.append(svgNode('title',{},`${trend.count}개 모델 · 설명용 지수 회귀 · 배가 시간 약 ${Math.round(trend.doublingDays)}일`));
  // Fixed sample dates keep every segment aligned during scale transitions.
  const samples=Array.from({length:97},(_,i)=>{
   const time=trend.start+(trend.displayEnd-trend.start)*i/96;
   return {x:x(new Date(time).toISOString()),y:y(Math.min(max,Math.max(min,trend.valueAt(time))))};
  });
  for(let i=1;i<samples.length;i++)group.append(svgNode('line',{x1:samples[i-1].x,y1:samples[i-1].y,x2:samples[i].x,y2:samples[i].y,'data-motion':`trend-${i}`}));
  svg.append(group);
  svg.append(svgNode('line',{x1:L+30,x2:L+60,y1:T+31,y2:T+31,class:'trend-key'}));
  svg.append(svgNode('text',{x:L+68,y:T+35,class:'trend-caption'},'지수 추세 · 2024년 이후'));
 }
 const earlyLabels=new Set(['gpt2','davinci_002','gpt_4']);
 const recentLabels=new Set(['gpt_5_2025_08_07_inspect','gemini_3_1_pro','gpt_5_4','claude_opus_4_6_inspect','claude_mythos_preview_early_inspect']);
 data.models.forEach(m=>{
  const xx=x(m.date),yy=y(m.estimate);
  svg.append(svgNode('line',{x1:xx,x2:xx,y1:y(Math.max(min,m.ci_low)),y2:y(Math.min(max,m.ci_high)),class:'ci','data-motion':`ci-${m.id}`}));
  // An upward cap indicates that the original interval continues beyond the plot.
  if(m.ci_high>max) svg.append(svgNode('path',{d:`M ${xx-3} ${T+4} L ${xx} ${T} L ${xx+3} ${T+4}`,fill:'none',stroke:'#254fd5','stroke-opacity':.5}));
  const label=`${m.name} · ${m.date} · ${duration(m.estimate)} · 95% 신뢰구간 ${duration(m.ci_low)}–${duration(m.ci_high)}`;
  const p=svgNode('circle',{cx:xx,cy:yy,'data-motion':`point-${m.id}`,r:earlyLabels.has(m.id)||recentLabels.has(m.id)?6:4.5,class:`point${m.estimate>960?' unreliable':''}`,tabindex:0,role:'button','aria-label':label});
  p.append(svgNode('title',{},label));
  const show=()=>{$('#chart-detail').textContent=label;};
  p.addEventListener('focus',show);p.addEventListener('mouseenter',show);p.addEventListener('click',show);p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
  svg.append(p);
 });
 // Early milestones are spread across the timeline; recent models get a
 // separate label column so dense release dates remain readable in both views.
 data.models.filter(m=>earlyLabels.has(m.id)).forEach(m=>{
  const name=m.id==='davinci_002'?'GPT-3':m.name;
  svg.append(svgNode('text',{x:x(m.date),y:y(m.estimate)-14,'text-anchor':'middle',class:'model-label','data-motion':`label-${m.id}`},name));
 });
 const labels=data.models.filter(m=>recentLabels.has(m.id)).map(m=>({m,yy:y(m.estimate)})).sort((a,b)=>a.yy-b.yy);
 labels.forEach((label,i)=>{label.ly=Math.max(T+9,label.yy,i?labels[i-1].ly+(labels[i-1].m.id==='claude_mythos_preview_early_inspect'?43:25):0);});
 for(let i=labels.length-1;i>=0;i--)labels[i].ly=Math.min(labels[i].ly,H-B-9-(labels.length-1-i)*25);
 labels.forEach(({m,yy,ly})=>{
  const labelX=W-R+24;
  svg.append(svgNode('line',{x1:x(m.date)+8,y1:yy,x2:labelX-7,y2:ly,class:'model-leader','data-motion':`leader-${m.id}`}));
  const name=m.id==='claude_mythos_preview_early_inspect'?'Claude Mythos Preview*':m.name;
  svg.append(svgNode('text',{x:labelX,y:ly+4,class:`model-label${m.estimate>960?' unreliable-label':''}`,'data-motion':`label-${m.id}`},name));
  if(m.id==='claude_mythos_preview_early_inspect')svg.append(svgNode('text',{x:labelX,y:ly+23,class:'model-date','data-motion':`date-${m.id}`},`출시일 ${m.date}`));
 });
 transitionChart(svg,animate);
}
function setChartScale(next, animate=true) {
 if(scale===next)return;
 scale=next;
 document.querySelectorAll('[data-scale]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.scale===scale)));
 if(data)drawChart(animate);
}
document.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>setChartScale(b.dataset.scale));
try {const response=await fetch('./data/metr.json');if(!response.ok)throw new Error('data');data=await response.json();drawChart();}catch{$('#metr-chart').innerHTML='<p>그래프 데이터를 불러오지 못했습니다. <a href="https://metr.org/time-horizons/">METR 공식 그래프 보기</a></p>';}
// Contribution graph: pad the first week so each column runs Sunday to Saturday.
try{
 const box=$('#contrib');
 const response=await fetch('./data/github-contributions.json');if(!response.ok)throw new Error('data');
 const {days}=await response.json();
 const level=n=>n===0?0:n<4?1:n<10?2:n<20?3:4;
 const pad=new Date(`${days[0][0]}T00:00:00Z`).getUTCDay();
 box.innerHTML='<i></i>'.repeat(pad)+days.map(([d,n])=>`<i class="l${level(n)}" title="${d} · ${n}회"></i>`).join('');
}catch{$('#contrib').innerHTML='<p>기여 그래프를 불러오지 못했습니다. <a href="https://github.com/serithemage">GitHub 프로필 보기</a></p>';}
