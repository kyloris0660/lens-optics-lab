'use strict';
(()=>{
const {index}=(()=>{
// Millimetres, radians, nm. Three-dimensional sequential geometrical ray tracing.
const WAVES=[486.1,587.6,656.3];
const GLASS={BK7:{name:'SCHOTT N-BK7',B:[1.03961212,.231792344,1.01046945],C:[.00600069867,.0200179144,103.560653]},F2:{name:'SCHOTT N-F2',B:[1.39757037,.159201403,1.2686543],C:[.00995906143,.0546931752,119.248346]}};
function index(glass,wl){if(glass==='air')return 1;const g=GLASS[glass],l=(wl/1000)**2;return Math.sqrt(1+g.B.reduce((a,b,i)=>a+b*l/(l-g.C[i]),0));}
function sag(s,r){if(!s.c)return 0;const a=1-(1+s.k)*s.c*s.c*r*r;if(a<0)return NaN;return s.c*r*r/(1+Math.sqrt(a));}
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const norm=a=>{let l=Math.hypot(...a);return a.map(x=>x/l);};
function surface(z,R,from,to,k=0){return {z,c:R===0?0:1/R,k,from,to,ap:13};}
const DEFAULT_RADII=[45.21210919489757,-41.735130352177706,-617.0111761345316]; // Teaching design: f_d=100 mm, F/C paraxial coincidence, d-line h=7 mm spherical correction.
function makeSystem(o={}){
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
function trace(sys,u,v,wl=587.6,field=0){
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
function pupil(n=384){return Array.from({length:n},(_,i)=>{const r=Math.sqrt((i+.5)/n),t=i*2.399963229728653;return [r*Math.cos(t),r*Math.sin(t)];});}
function bundle(sys,diam=20,field=0,waves=WAVES,n=384){const rays=[];for(const wl of waves)for(const [u,v]of pupil(n)){const r=trace(sys,u*diam/2,v*diam/2,wl,field);if(r)rays.push(r);}return rays;}
function bestFocus(rays){if(!rays.length)return NaN;let ma=[0,0],mb=[0,0];for(const r of rays)for(let i=0;i<2;i++){ma[i]+=r.a[i]/rays.length;mb[i]+=r.b[i]/rays.length;}let ab=0,bb=0;for(const r of rays)for(let i=0;i<2;i++){ab+=(r.a[i]-ma[i])*(r.b[i]-mb[i]);bb+=(r.b[i]-mb[i])**2;}return -ab/bb;}
function spot(rays,z){const pts=rays.map(r=>({x:r.a[0]+z*r.b[0],y:r.a[1]+z*r.b[1],wl:r.wl}));const cx=pts.reduce((a,p)=>a+p.x,0)/pts.length,cy=pts.reduce((a,p)=>a+p.y,0)/pts.length;return {pts,cx,cy,rms:Math.sqrt(pts.reduce((a,p)=>a+(p.x-cx)**2+(p.y-cy)**2,0)/pts.length)};}
function paraxial(sys,wl=587.6){const r=trace(sys,.001,0,wl,0);return {z:-r.a[0]/r.b[0],efl:-.001/r.b[0]};}
function analyse(o){const sys=makeSystem(o),waves=o.white?WAVES:[o.wl||587.6],rays=bundle(sys,o.diam||20,o.field||0,waves),best=bestFocus(rays),z=o.sensor??best,p=paraxial(sys),f=WAVES.map(w=>paraxial(sys,w).z),sp=spot(rays,z);const chief=trace(sys,0,0,587.6,o.field||0);return {sys,rays,best,z,sp,efl:p.efl,f,fc:Math.abs(f[0]-f[2]),n:p.efl/(o.diam||20),pass:rays.length/(384*waves.length),chief:chief?chief.a[0]+z*chief.b[0]:0};}

return {analyse,makeSystem,trace,paraxial,index,sag,WAVES};
})();
const {geometry,diffraction,opticalMTF,airy}=(()=>{
function geometry(f=35,N=1.8,s=2000,c=.03){
 const v=f*s/(s-f),D=f/N,t=c/(D*v),near=1/(1/s+t),far=1/s>t?1/(1/s-t):Infinity;
 return {f,N,s,c,v,D,near,far,m:v/s,hyperfocal:f*f/(N*c)+f,view:2*Math.atan(36/(2*f))*180/Math.PI,bg:D*v*Math.abs(1/20000-1/s)};
}
function opticalMTF(q){if(q<0)q=-q;if(q>=1)return 0;return 2/Math.PI*(Math.acos(q)-q*Math.sqrt(1-q*q));}
function diffraction(N=8,lambdaNm=550,pixelUm=4){const l=lambdaNm/1e6;return {diameter:2.44*l*N*1000,radius:1.22*l*N*1000,cutoff:1/(l*N),nyquist:1000/(2*pixelUm),pixel:p=>Math.abs(p===0?1:Math.sin(Math.PI*pixelUm/1000*p)/(Math.PI*pixelUm/1000*p))};}
// Numerical Recipes / rational approximations of Bessel J1, adequate for plot display.
function j1(x){const a=Math.abs(x);let y,ans;if(a<8){y=x*x;ans=x*(72362614232+y*(-7895059235+y*(242396853.1+y*(-2972611.439+y*(15704.4826+y*(-30.16036606))))))/(144725228442+y*(2300535178+y*(18583304.74+y*(99447.43394+y*(376.9991397+y)))));}else{const z=8/a;y=z*z;const xx=a-2.356194491,A=1+y*(.00183105+y*(-.00003516396496+y*(.000002457520174+y*(-.000000240337019)))),B=.04687499995+y*(-.0002002690873+y*(.000008449199096+y*(-.00000088228987+y*.000000105787412)));ans=Math.sqrt(.636619772/a)*(Math.cos(xx)*A-z*Math.sin(xx)*B);if(x<0)ans=-ans;}return ans;}
function airy(r,lambdaN){if(r===0)return 1;const x=Math.PI*r/lambdaN;return (2*j1(x)/x)**2;}

return {geometry,diffraction,opticalMTF,airy};
})();
const $=id=>document.getElementById(id),F=(x,d=2)=>Number.isFinite(x)?x.toFixed(d):'∞';
function canvas(id){const el=$(id),c=el.getContext('2d');c.fillStyle='#101a28';c.fillRect(0,0,el.width,el.height);c.font='16px sans-serif';c.lineWidth=1;c.textAlign='left';return [c,el.width,el.height];}
function line(c,x,y,x2,y2,color='#354c60',dash=[]){c.beginPath();c.strokeStyle=color;c.setLineDash(dash);c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);}
function text(c,t,x,y,color='#b8cbdc',size=16){c.fillStyle=color;c.font=size+'px sans-serif';c.fillText(t,x,y);}
const number=(label,value)=>`<div><span>${label}</span><strong>${value}</strong></div>`;
function geo(){const g=geometry(+$('gf').value,+$('gn').value,+$('gs').value*1000,+$('gc').value);
 $('gfOut').textContent=g.f+' mm';$('gnOut').textContent='f/'+F(g.N,1);$('gsOut').textContent=F(g.s/1000,2)+' m';$('gcOut').textContent=F(g.c*1000,0)+' μm';
 $('geoNumbers').innerHTML=number('入瞳直径 D',F(g.D)+' mm')+number('水平视角（无限远）',F(g.view)+'°')+number('近界 → 远界',F(g.near/1000,3)+' → '+F(g.far/1000,3)+' m')+number('主体在像面上的放大倍率',F(g.m,4)+'×')+number('20 m 背景几何离焦圆直径',F(g.bg*1000,1)+' μm')+number('超焦距（按当前阈值）',F(g.hyperfocal/1000,2)+' m');
 const aperture=Math.min(92,20+g.D*1.1),sensor=735,focus=735+Math.max(-95,Math.min(95,(g.f*20000/(20000-g.f)-g.v)*8));
 let svg=`<svg viewBox="0 0 900 280" xmlns="http://www.w3.org/2000/svg"><line x1="32" y1="140" x2="855" y2="140" stroke="#354c60" stroke-dasharray="5 6"/><path d="M400 26Q371 140 400 254Q429 140 400 26" fill="#79e4d229" stroke="#79e4d2"/><line x1="${sensor}" y1="32" x2="${sensor}" y2="248" stroke="#e8effa" stroke-width="3"/>`;
 for(const sign of [-1,0,1]){const h=140+aperture*sign;svg+=`<polyline points="50,140 400,${h} ${sensor},140" fill="none" stroke="#79e4d2" stroke-width="2"/>`;if(sign)svg+=`<polyline points="24,${h} 400,${h} ${focus},140 845,${140+(140-h)*(845-focus)/(focus-400)}" fill="none" stroke="#ffcb73" stroke-width="1.6" stroke-opacity=".75"/>`;}
 svg+=`<circle cx="50" cy="140" r="5" fill="#79e4d2"/><text x="30" y="265" fill="#a6bfd0" font-size="17">物点 u=${F(g.s/1000,2)} m</text><text x="365" y="265" fill="#a6bfd0" font-size="17">薄透镜</text><text x="620" y="22" fill="#a6bfd0" font-size="17">传感器 v=${F(g.v,3)} mm</text><text x="30" y="23" fill="#79e4d2" font-size="16">青：主体光锥　黄：远背景会聚位置（示意）</text></svg>`;$('geoDiagram').innerHTML=svg;
}
const explanations={
 ideal:['理想圆孔：没有几何像差，也不是无限小的点','圆孔内波前误差为零，但有限孔径仍造成衍射。图上中心周围出现环，不是球差自动冒出来了。','下方较细的条纹在理想系统里也会失去反差；这就是有限孔径的空间频率响应。','这条基准只适用于当前孔径、波长和成像条件；改变 f 值会改变物理尺度。'],
 defocus:['失焦：参考像面放错了','波前包含二次径向误差；整束光的最佳会聚位置与传感器不匹配。这里不改变任何玻璃色散。','点像扩散，文字边缘变宽，高频条纹先损失反差。','单独的失焦原则上能通过移动焦面或重新对焦消除；这与无法用一个焦面完全消掉的球差不同。'],
 spherical:['球差：不同孔径区没有共同焦点','轴对称的高阶径向波前偏差。这里用含平衡离焦项的主球差模式，避免把它简单当成纯失焦。','点像仍大致轴对称，但能量在核心与周围光晕之间重新分布。条纹反差降低，某些轮廓出现光环。','合理非球面、多片设计、光焦度分配和缩小光圈可以改善；改变焦面只能取一个折中。'],
 coma:['彗差：离轴点像出现不对称','波前误差随孔径高度与方向变化，使来自不同孔径区的贡献无法对称重合。本图固定为横向彗差模式。','一个点成为带尾巴的斑，文字和点阵出现不对称拖影；实际镜头里彗差方向通常随视场方位转动。','现实照片还需排除机震与物体运动。缩光圈和光学设计可改善，但本图不声称对应某个视场角的某支镜头。'],
 astigmatism:['像散：不同方向的焦面不一致','波前含 x²−y² 方向差。当前展示不额外加离焦项的中间参考面。','点像可能出现十字、菱形或复杂的对称分布，并不一定总是单一椭圆。','切换下面两个焦面状态，观察伸长方向改变。这比只记“像散就是椭圆”更准确。'],
 'astig-near':['像散：移向一个方向的焦面','在同一个像散模式上额外叠加负的离焦项，表示观察像面朝一个方向移动。','一组方向更集中，另一组方向展开。切换到另一焦面会交换伸长方向。','“近 / 远”是这套符号约定下的相对状态，不是任意镜头的固定切向 / 弧矢先后顺序。'],
 'astig-far':['像散：移向另一方向的焦面','仍是同样的像散，只把额外离焦项的符号改成正值。','伸长方向相对上一状态改变，说明单一平面难让两种方向都同时最佳。','继续重对焦只是换取舍；校正像散需要改变系统设计或限制使用条件。']};
let model=null,atlasRequest=0;
function atlas(){const typ=$('abType').value,level=$('abLevel').value,key=typ==='ideal'?'ideal':typ+'-'+level;
 $('abLevel').disabled=typ==='ideal';$('waveImg').src='guide-assets/'+key+'-wave.png';$('psfImg').src='guide-assets/'+key+'-psf.png';$('abImage').src='guide-assets/'+key+'-image.png';
 const e=explanations[typ];$('abExplanation').innerHTML=`<h3>${e[0]}</h3><p><b>原理：</b>${e[1]}</p><p><b>直观结果：</b>${e[2]}</p><p><b>怎样理解：</b>${e[3]}</p>`;
 const v=model?.cases[key];$('abMetric').innerHTML=v?`实际波前 RMS ${F(v.rmsWaves,3)} λ<br>点像峰值比 ${F(v.peakRatio,3)}`:'正在载入计算参数…';atlasRequest++;
}
function dispersion(){const [c,W,H]=canvas('dispersion'),xmin=400,xmax=700,ymin=-.01,ymax=.034,X=x=>72+(x-xmin)/(xmax-xmin)*(W-106),Y=y=>H-55-(y-ymin)/(ymax-ymin)*(H-91);
 for(const y of [-.01,0,.01,.02,.03]){line(c,72,Y(y),W-34,Y(y));text(c,F(y,2),10,Y(y)+5,'#a6b9cc',14);}for(const x of [400,450,500,550,600,650,700]){line(c,X(x),35,X(x),H-55);text(c,x+'',X(x)-12,H-29,'#a6b9cc',14);}for(const [g,col]of [['BK7','#79e4d2'],['F2','#ffcb73']]){c.beginPath();c.strokeStyle=col;c.lineWidth=2.5;for(let w=400;w<=700;w++){const x=X(w),y=Y(index(g,w)-index(g,587.6));w===400?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}text(c,'n(λ) − nd',9,18,'#c1d4e3',15);text(c,'N-BK7  nd≈1.5168  Vd≈64.2',100,25,'#79e4d2',15);text(c,'N-F2  nd≈1.62005  Vd≈36.4',440,25,'#ffcb73',15);text(c,'波长 / nm',W-124,H-5,'#a6b9cc',14);c.lineWidth=1;}
function colorDemo(){const [c,W,H]=canvas('colorDemo');text(c,'轴向：同中心，不同模糊范围',35,30);text(c,'横向：不同颜色倍率不同',468,30);c.save();c.globalCompositeOperation='screen';for(const [r,col]of [[68,'#e6404077'],[42,'#40c870aa'],[22,'#4888f4bb']]){const g=c.createRadialGradient(220,153,0,220,153,r);g.addColorStop(.65,col);g.addColorStop(1,'#00000000');c.fillStyle=g;c.beginPath();c.arc(220,153,r,0,Math.PI*2);c.fill();}for(const [m,col]of [[1.04,'#ff5050'],[1,'#50e070'],[.96,'#508cff']]){c.strokeStyle=col;c.lineWidth=2;for(const x of [-100,-50,0,50,100]){line(c,675+x*m,68,675+x*m,238,col);}c.strokeRect(675-130*m,153-80*m,260*m,160*m);}c.restore();text(c,'近焦颜色形成较小核心，其他颜色成光晕',45,269,'#92abc0',14);text(c,'越远离中心，轮廓错位越明显',490,269,'#92abc0',14);}
function field(){const [c,W,H]=canvas('fieldCanvas'),type=$('fieldType').value,a=+$('fieldStrength').value;$('fieldStrengthOut').textContent=F(a,2);if(type==='curvature'){text(c,'像面截面：平面传感器与弯曲最佳像面',35,28);line(c,55,205,845,205,'#466079',[5,5]);line(c,545,65,545,345,'#dfeaf7');c.beginPath();c.strokeStyle='#79e4d2';c.lineWidth=3;for(let y=65;y<=345;y++){const x=545-a*160*((y-205)/140)**2;y===65?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();for(const y of [90,145,205,265,320]){const x=545-a*160*((y-205)/140)**2;c.fillStyle='#79e4d2';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();line(c,x,y,545,y,'#ffcb73',[4,4]);}text(c,'青：各视场最佳焦点组成的曲面',55,376,'#79e4d2');text(c,'白：平面传感器',570,86,'#dfeaf7');$('fieldCaption').textContent='用 z=z₀−a·H² 的抛物面截面作场曲示意；不按真实距离比例。中心恰好合焦，不代表边缘最佳焦点也在白线上。这里未叠加像散。';return;}
 const centers=[245,675],scale=165;for(let p=0;p<2;p++){const cx=centers[p];c.save();c.beginPath();c.rect(cx-180,48,360,302);c.clip();c.fillStyle='#192b3b';c.fillRect(cx-180,48,360,302);const map=(x,y)=>{const r2=x*x+y*y;let f=1;if(p&&type==='barrel')f=1-.18*a*r2;if(p&&type==='pincushion')f=1+.18*a*r2;if(p&&type==='moustache')f=1-.32*a*r2+.23*a*r2*r2;return [cx+scale*x*f,200+scale*.78*y*f];};for(let axis=0;axis<2;axis++)for(let k=-5;k<=5;k++){c.beginPath();c.strokeStyle='#89c8d0';c.lineWidth=1.3;for(let j=0;j<=120;j++){const q=-1+j/60,[x,y]=axis?[k/5,q]:[q,k/5],xy=map(x,y);j?c.lineTo(...xy):c.moveTo(...xy);}c.stroke();}if(type==='vignette'&&p){const g=c.createRadialGradient(cx,200,15,cx,200,225);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${a*.95})`);c.fillStyle=g;c.fillRect(cx-180,48,360,302);}c.restore();text(c,p?'当前示意':'无变化基准',cx-65,30);}if(type==='vignette')$('fieldCaption').textContent='暗角只改变这里的亮度，不移动网格位置。渐变程度是辨认示意，不是 cos⁴θ 或具体镜头的相对照度预测。';else $('fieldCaption').textContent='前向径向映射 r′=r(1+k₁r²+k₂r⁴)，边缘可能被同一画幅裁切；位置改变不等于点扩散。桶形 k₁=−0.18a，枕形 +0.18a，波浪形 k₁=−0.32a、k₂=0.23a；a 是滑块示意系数，不是畸变百分比。';text(c,'同一网格 / 同一显示画幅',330,392,'#91a8bc',14);}
function diff(){const N=+$('dn').value,l=+$('dl').value,p=+$('dp').value,d=diffraction(N,l,p);$('dnOut').textContent='f/'+F(N,1);$('dlOut').textContent=l+' nm';$('dpOut').textContent=F(p,1)+' μm';$('diffNumbers').innerHTML=number('艾里第一暗环直径',F(d.diameter)+' μm')+number('理想光学截止频率',F(d.cutoff,1)+' lp/mm')+number('像素 Nyquist',F(d.nyquist,1)+' lp/mm');
 const [c,W,H]=canvas('diffCanvas'),S=220,im=c.createImageData(S,S),radius=30;for(let y=0;y<S;y++)for(let x=0;x<S;x++){const r=Math.hypot(x-S/2,y-S/2)*radius/(S/2),v=Math.min(255,255*Math.pow(airy(r,l/1000*N),.25)),i=(y*S+x)*4;im.data[i]=v*.65;im.data[i+1]=v;im.data[i+2]=v*.95;im.data[i+3]=255;}c.putImageData(im,55,65);const rr=d.radius*S/(2*radius);c.beginPath();c.strokeStyle='#ffcb73';c.setLineDash([4,4]);c.arc(165,175,rr,0,Math.PI*2);c.stroke();c.setLineDash([]);text(c,'PSF / 固定宽 60 μm',57,38);text(c,'虚线：第一暗环',65,320,'#ffcb73',14);
 const X=x=>390+x/500*465,Y=y=>290-y*225;for(const q of [0,.25,.5,.75,1]){line(c,390,Y(q),855,Y(q));text(c,F(q,2),346,Y(q)+5,'#9ab1c6',14);}for(const f of [0,100,200,300,400,500])text(c,f+'',X(f)-10,315,'#9ab1c6',14);for(const pixel of [false,true]){c.beginPath();c.strokeStyle=pixel?'#ffcb73':'#79e4d2';c.lineWidth=2;for(let f=0;f<=500;f++){const v=opticalMTF(f/d.cutoff)*(pixel?d.pixel(f):1);f?c.lineTo(X(f),Y(v)):c.moveTo(X(f),Y(v));}c.stroke();}line(c,X(d.nyquist),58,X(d.nyquist),293,'#c9d7e8',[5,5]);text(c,'青：光学　黄：光学 × 像素孔径',385,36,'#bdd1e3',15);text(c,'空间频率 / lp/mm',575,348,'#9ab1c6',14);c.lineWidth=1;
}
function bars(){const [c,W,H]=canvas('mtfBars'),v=+$('contrast').value;$('contrastOut').textContent=F(v,2);for(let p=0;p<2;p++){const start=p?475:25,m=p?v:1;for(let x=0;x<390;x++){const value=Math.round(127.5*(1+m*Math.cos(2*Math.PI*x/26)));c.fillStyle=`rgb(${value},${value},${value})`;c.fillRect(start+x,48,1,100);}text(c,p?'输出：明暗差缩小，平均亮度不变':'输入：固定正弦条纹',start,30,'#aec3d5',16);}text(c,'输入调制度 1.00',30,178,'#8faabe',14);text(c,'当前 MTF = '+F(v,2),480,178,'#79e4d2',14);}
function bokeh(){const [c,W,H]=canvas('bokehCanvas'),labels=['柔和边缘','明亮边缘','猫眼 / 口径蚀','洋葱圈'];for(let j=0;j<4;j++){const x=115+j*222,y=125,r=65;c.save();if(j===2){c.beginPath();c.ellipse(x-18,y,65,65,0,0,Math.PI*2);c.clip();c.beginPath();c.ellipse(x+23,y,65,65,0,0,Math.PI*2);c.clip();}const g=c.createRadialGradient(x,y,0,x,y,r);if(j===0){g.addColorStop(0,'#ffdb89');g.addColorStop(.5,'#d6ae62');g.addColorStop(1,'#1a283300');}else if(j===1){g.addColorStop(0,'#866541');g.addColorStop(.75,'#987748');g.addColorStop(.94,'#ffe6a6');g.addColorStop(1,'#17263600');}else{g.addColorStop(0,'#e3bc75');g.addColorStop(.95,'#d8b274');g.addColorStop(1,'#1a283300');}c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();if(j===3)for(let z=9;z<60;z+=9){c.strokeStyle='#82663f';c.lineWidth=2;c.beginPath();c.arc(x,y,z,0,Math.PI*2);c.stroke();}c.restore();text(c,labels[j],x-58,232,'#bdccdb',16);}text(c,'焦外斑辨认示意，亮度与尺寸任意设定',260,270,'#8fa5b9',14);}
for(const id of ['gf','gn','gs','gc'])$(id).addEventListener('input',geo);for(const b of document.querySelectorAll('[data-geo]'))b.addEventListener('click',()=>{const [f,N,s]=b.dataset.geo.split(',');$('gf').value=f;$('gn').value=N;$('gs').value=s;geo();});
for(const id of ['abType','abLevel'])$(id).addEventListener('change',atlas);$('fieldType').addEventListener('change',field);$('fieldStrength').addEventListener('input',field);for(const id of ['dn','dl','dp'])$(id).addEventListener('input',diff);$('contrast').addEventListener('input',bars);
geo();atlas();dispersion();colorDemo();field();diff();bars();bokeh();
model={"model":"scalar Fraunhofer, incoherent image intensity convolution; uniform circular pupil","wavelength_nm":550,"f_number":4,"image_pixel_um":0.55,"psf_panel_width_um":44.55,"target_width_um":281.6,"FFT_size":512,"pupil_diameter_pixels":128,"PSF_display":"shared log10 ideal-peak-relative intensity, -4 to 0 decades","wave_display":"fixed -1.6 to +1.6 waves","cases":{"ideal":{"peakRatio":1.0,"rmsWaves":0.0,"energy":1.0,"kernelRetainedEnergy":0.9999609255451255},"defocus-0.08":{"peakRatio":0.772007364389788,"rmsWaves":0.07990838769468295,"energy":1.0,"kernelRetainedEnergy":0.9999609064044076},"defocus-0.2":{"peakRatio":0.1434762548692721,"rmsWaves":0.19977096923670737,"energy":1.0,"kernelRetainedEnergy":0.9999608056675515},"defocus-0.4":{"peakRatio":0.04616810271935337,"rmsWaves":0.39954193847341474,"energy":1.0000000000000002,"kernelRetainedEnergy":0.9999604424599791},"spherical-0.08":{"peakRatio":0.7741006313178801,"rmsWaves":0.07982211999268317,"energy":1.0,"kernelRetainedEnergy":0.9999606389469075},"spherical-0.2":{"peakRatio":0.18305929329403836,"rmsWaves":0.19955529998170793,"energy":1.0,"kernelRetainedEnergy":0.9999590781289363},"spherical-0.4":{"peakRatio":0.13136006953718937,"rmsWaves":0.39911059996341586,"energy":0.9999999999999999,"kernelRetainedEnergy":0.9999526235774587},"coma-0.08":{"peakRatio":0.775292095929996,"rmsWaves":0.07986426354992375,"energy":0.9999999999999998,"kernelRetainedEnergy":0.9999757167816876},"coma-0.2":{"peakRatio":0.21745770728084343,"rmsWaves":0.19966065887480935,"energy":1.0000000000000002,"kernelRetainedEnergy":0.9999656946524924},"coma-0.4":{"peakRatio":0.10059448187828043,"rmsWaves":0.3993213177496187,"energy":1.0,"kernelRetainedEnergy":0.999966774961376},"astigmatism-0.08":{"peakRatio":0.7765493880120105,"rmsWaves":0.07978741311128501,"energy":1.0000000000000002,"kernelRetainedEnergy":0.9999608575801804},"astigmatism-0.2":{"peakRatio":0.1983824477095431,"rmsWaves":0.19946853277821253,"energy":1.0,"kernelRetainedEnergy":0.9999607369831737},"astigmatism-0.4":{"peakRatio":0.04202236301066906,"rmsWaves":0.39893706555642505,"energy":1.0000000000000002,"kernelRetainedEnergy":0.9999606223026436},"astig-near-0.08":{"peakRatio":0.6884679419357496,"rmsWaves":0.097441536311437,"energy":1.0,"kernelRetainedEnergy":0.9999608481872462},"astig-near-0.2":{"peakRatio":0.23285951099790794,"rmsWaves":0.2436038407785925,"energy":0.9999999999999998,"kernelRetainedEnergy":0.9999606777890323},"astig-near-0.4":{"peakRatio":0.11106191888961797,"rmsWaves":0.487207681557185,"energy":1.0,"kernelRetainedEnergy":0.9999603795794019},"astig-far-0.08":{"peakRatio":0.6884679419357493,"rmsWaves":0.097441536311437,"energy":1.0000000000000002,"kernelRetainedEnergy":0.9999608481872464},"astig-far-0.2":{"peakRatio":0.23285951099790783,"rmsWaves":0.2436038407785925,"energy":1.0,"kernelRetainedEnergy":0.9999606777890326},"astig-far-0.4":{"peakRatio":0.11106191888961796,"rmsWaves":0.487207681557185,"energy":1.0,"kernelRetainedEnergy":0.9999603795794019}},"airy_profile_max_absolute_error":0.00037691393978578347};atlas();


})();
