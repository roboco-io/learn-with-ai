// Unweighted least squares of log(human minutes) against release date.
// This explanatory fit is independent of METR's official trend estimates.
export function fitExponentialTrend(models) {
 const day=86400000, since=Date.parse('2023-01-01');
 const samples=models.map(m=>({t:Date.parse(m.date),v:m.estimate})).filter(m=>Number.isFinite(m.t) && m.t>=since && Number.isFinite(m.v) && m.v>0 && m.v<=960);
 if(samples.length<2)return null;
 const start=Math.min(...samples.map(m=>m.t)), end=Math.max(...samples.map(m=>m.t));
 const points=samples.map(m=>({x:(m.t-start)/day,y:Math.log(m.v)}));
 const meanX=points.reduce((sum,p)=>sum+p.x,0)/points.length;
 const meanY=points.reduce((sum,p)=>sum+p.y,0)/points.length;
 const variance=points.reduce((sum,p)=>sum+(p.x-meanX)**2,0);
 if(!variance)return null;
 const slope=points.reduce((sum,p)=>sum+(p.x-meanX)*(p.y-meanY),0)/variance;
 return {start,end,count:samples.length,doublingDays:slope>0?Math.LN2/slope:null,valueAt:time=>Math.exp(meanY+slope*((time-start)/day-meanX))};
}
