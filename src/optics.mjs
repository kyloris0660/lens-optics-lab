// Millimetres, radians, nm. Three-dimensional sequential geometrical ray tracing.
export const WAVES=[486.1,587.6,656.3];
export const GLASS={BK7:{name:'SCHOTT N-BK7',B:[1.03961212,.231792344,1.01046945],C:[.00600069867,.0200179144,103.560653]},F2:{name:'SCHOTT N-F2',B:[1.39757037,.159201403,1.2686543],C:[.00995906143,.0546931752,119.248346]}};
export function index(glass,wl){if(glass==='air')return 1;const g=GLASS[glass],l=(wl/1000)**2;return Math.sqrt(1+g.B.reduce((a,b,i)=>a+b*l/(l-g.C[i]),0));}
export function sag(s,r){if(!s.c)return 0;const a=1-(1+s.k)*s.c*s.c*r*r;if(a<0)return NaN;return s.c*r*r/(1+Math.sqrt(a));}
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const norm=a=>{let l=Math.hypot(...a);return a.map(x=>x/l);};
function surface(z,R,from,to,k=0){return {z,c:R===0?0:1/R,k,from,to,ap:13};}
export const DEFAULT_RADII=[45.21210919489757,-41.735130352177706,-617.0111761345316]; // Teaching design: f_d=100 mm, F/C paraxial coincidence, d-line h=7 mm spherical correction.
export function makeSystem(o={}){
 const mode=o.mode||'sphere';let s=[],elements=[];
 if(mode==='sphere'||mode==='asphere'){
  const k=mode==='asphere'?(o.k??-(index('BK7',587.6)**2)):0;
  s=[surface(0,0,'air','BK7'),surface(5,-50,'BK7','air',k)];elements=[{a:0,b:1,glass:'BK7',label:'正透镜'}];
 }else{
  const [r1,r2,r3]=o.radii||DEFAULT_RADII, gap=o.gap||0, material=o.sameGlass?'BK7':'F2';
  if(o.removeNegative){s=[surface(0,r1,'air','BK7'),surface(5,r2,'BK7','air')];elements=[{a:0,b:1,glass:'BK7',label:'保留正片'}];}
  else if(gap===0){s=[surface(0,r1,'air','BK7'),surface(5,r2,'BK7',material),surface(8,r3,material,'air')];elements=[{a:0,b:1,glass:'BK7',label:'正片'},{a:1,b:2,glass:material,label:'负片'}];}
  else{s=[surface(0,r1,'air','BK7'),surface(5,r2,'BK7','air'),surface(5+gap,r2,'air',material),surface(8+gap,r3,material,'air')];elements=[{a:0,b:1,glass:'BK7',label:'正片'},{a:2,b:3,glass:material,label:'负片'}];}
  if(o.extra){const z=s.at(-1).z+8,a=s.length;s.push(surface(z,0,'air','BK7'),surface(z+3,-150,'BK7','air'));elements.push({a,b:a+1,glass:'BK7',label:'额外正片'});}
 }
 return {surfaces:s,elements,groups:elements.length-(mode==='doublet'&&!o.removeNegative&&!(o.gap>0)?1:0)};
}
export function trace(sys,u,v,wl=587.6,field=0){
 const angle=field*Math.PI/180;let p=[-10,u-10*Math.tan(angle),v],d=[Math.cos(angle),Math.sin(angle),0];const path=[p];
 for(const s of sys.surfaces){
  let t=(s.z-p[0])/d[0],q;
  for(let it=0;it<25;it++){
   q=p.map((x,i)=>x+t*d[i]);const r=Math.hypot(q[1],q[2]),a=1-(1+s.k)*s.c*s.c*r*r;
   if(a<=0)return null;const z=sag(s,r),g=s.c/Math.sqrt(a),f=q[0]-s.z-z,fp=d[0]-g*(q[1]*d[1]+q[2]*d[2]);
   if(Math.abs(f)<1e-11)break;t-=f/fp;if(!Number.isFinite(t))return null;
  }
  q=p.map((x,i)=>x+t*d[i]);const r=Math.hypot(q[1],q[2]);if(t< -1e-7||r>s.ap||Math.abs(q[0]-s.z-sag(s,r))>1e-7)return null;
  const g=s.c/Math.sqrt(1-(1+s.k)*s.c*s.c*r*r);let N=norm([-1,g*q[1],g*q[2]]);if(dot(d,N)>0)N=N.map(x=>-x);
  const eta=index(s.from,wl)/index(s.to,wl),cos=-dot(d,N),disc=1-eta*eta*(1-cos*cos);if(disc<0)return null;
  d=norm(d.map((x,i)=>eta*x+(eta*cos-Math.sqrt(disc))*N[i]));if(d[0]<=0)return null;
  p=q;path.push(q);
 }
 return {p,d,path,wl,a:[p[1]-p[0]*d[1]/d[0],p[2]-p[0]*d[2]/d[0]],b:[d[1]/d[0],d[2]/d[0]]};
}
export function pupil(n=384){return Array.from({length:n},(_,i)=>{const r=Math.sqrt((i+.5)/n),t=i*2.399963229728653;return [r*Math.cos(t),r*Math.sin(t)];});}
export function bundle(sys,diam=20,field=0,waves=WAVES,n=384){const rays=[];for(const wl of waves)for(const [u,v]of pupil(n)){const r=trace(sys,u*diam/2,v*diam/2,wl,field);if(r)rays.push(r);}return rays;}
export function bestFocus(rays){if(!rays.length)return NaN;let ma=[0,0],mb=[0,0];for(const r of rays)for(let i=0;i<2;i++){ma[i]+=r.a[i]/rays.length;mb[i]+=r.b[i]/rays.length;}let ab=0,bb=0;for(const r of rays)for(let i=0;i<2;i++){ab+=(r.a[i]-ma[i])*(r.b[i]-mb[i]);bb+=(r.b[i]-mb[i])**2;}return -ab/bb;}
export function spot(rays,z){const pts=rays.map(r=>({x:r.a[0]+z*r.b[0],y:r.a[1]+z*r.b[1],wl:r.wl}));const cx=pts.reduce((a,p)=>a+p.x,0)/pts.length,cy=pts.reduce((a,p)=>a+p.y,0)/pts.length;return {pts,cx,cy,rms:Math.sqrt(pts.reduce((a,p)=>a+(p.x-cx)**2+(p.y-cy)**2,0)/pts.length)};}
export function paraxial(sys,wl=587.6){const r=trace(sys,.001,0,wl,0);return {z:-r.a[0]/r.b[0],efl:-.001/r.b[0]};}
export function analyse(o){const sys=makeSystem(o),waves=o.white?WAVES:[o.wl||587.6],rays=bundle(sys,o.diam||20,o.field||0,waves),best=bestFocus(rays),z=o.sensor??best,p=paraxial(sys),f=WAVES.map(w=>paraxial(sys,w).z),sp=spot(rays,z);const chief=trace(sys,0,0,587.6,o.field||0);return {sys,rays,best,z,sp,efl:p.efl,f,fc:Math.abs(f[0]-f[2]),n:p.efl/(o.diam||20),pass:rays.length/(384*waves.length),chief:chief?chief.a[0]+z*chief.b[0]:0};}
