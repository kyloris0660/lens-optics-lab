import {analyse,makeSystem,trace,paraxial,index,sag,WAVES} from './optics.mjs';
const $=id=>document.getElementById(id),ideal=-(index('BK7',587.6)**2),names={sphere:'单片球面',asphere:'单片非球面',doublet:'消色差组合'};
const defaults={mode:'sphere',white:true,wl:587.6,diam:20,field:0,k:ideal,gap:0,removeNegative:false,sameGlass:false,extra:false,auto:true,sensor:98};
let state={...defaults},current,reference=null;
const color=w=>w<520?'#62aaff':w<620?'#ffcb73':'#ff777f';
const fmt=(v,d=3)=>Number.isFinite(v)?v.toFixed(d):'—';
const mic=v=>v<.001?'＜0.001':fmt(v,v<10?3:2);
function opts(){const o={...state};if(o.auto)delete o.sensor;return o;}
function sync(){
 document.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===state.mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 $('asphereControls').hidden=state.mode!=='asphere';$('doubletControls').hidden=state.mode!=='doublet';
 for(const id of ['diam','field','k','gap','sensor'])$(id).value=state[id];
 for(const id of ['removeNegative','sameGlass','extra','auto'])$(id).checked=state[id];
 $('light').value=state.white?'white':String(state.wl);$('sensor').disabled=state.auto;
 $('sameGlass').disabled=state.removeNegative;$('gap').disabled=state.removeNegative;
 $('diamOut').textContent=fmt(state.diam,1)+' mm';$('fieldOut').textContent=fmt(state.field,2)+'°'+(state.field===0?' · 画面中心':' · 离轴');$('kOut').textContent=fmt(state.k,5);$('gapOut').textContent=fmt(state.gap,1)+' mm'+(state.gap===0?' · 胶合':' · 分离');$('sensorOut').textContent=fmt(state.sensor,3)+' mm';
}
function update(){
 current=analyse(opts());if(state.auto)state.sensor=current.z;sync();
 $('structure').textContent=current.sys.groups+' 组 '+current.sys.elements.length+' 片';
 $('rms').textContent=mic(current.sp.rms*1000)+' μm';$('fc').textContent=mic(current.fc*1000)+' μm';$('efl').textContent=fmt(current.efl,2)+' mm';$('fnumber').textContent='约 f/'+fmt(current.n,2)+' · 几何通光 '+fmt(current.pass*100,0)+'%';
 const a=current;let msg;
 if(state.mode==='sphere')msg='同一个物点的光线没有落在同一个点。<strong>换成单色光可单独观察球差</strong>；换成三色光，会再叠加不同颜色的焦点错位。';
 else if(state.mode==='asphere')msg=state.white?'形状校正不能代替材料消色差。<strong>即使非球面正确，三色光仍然分开</strong>。切到 587.6 nm、0°，再设为校正值看看。':state.field>0?'轴上校正不是全画面校正。<strong>离开画面中心，离轴像差仍可能出现</strong>；这里显示当前角度的实际光斑。':Math.abs(state.k-ideal)<.0001&&state.wl===587.6?'在指定黄光与轴上条件下，<strong>几何球差已校正到数值精度</strong>。现实点像仍受衍射限制，不会无限小。':'调整面形会改变不同高度光线的交点。<strong>校正只针对指定条件，不是 k 越负越好</strong>。';
 else msg=state.removeNegative?'拆掉负片后，聚光能力变强、焦距缩短，但<strong>原来的像差补偿关系也被拆掉了</strong>。请同时比较焦距、f 值和重新对焦后的光斑。':state.sameGlass?'形状和片数没有减少，但两片变成同种玻璃，<strong>原先针对两种色散设计的补偿不再成立</strong>。':state.extra?'第三片带来额外光焦度，也带来新的像差。<strong>这次随意加片没有重新优化设计</strong>；更多镜片不自动等于更高画质。':state.gap>0?'拉开间距后，光线打到下一面的高度改变，焦距与像差也随之变化。<strong>镜片的位置同样属于光学设计</strong>。':'两种玻璃与正、负光焦度配合，<strong>让红蓝近轴焦点重合</strong>。中间波长、全孔径和离轴仍可能有残余像差。';
 if(!state.auto)msg+=' 当前传感器已固定；<strong>点击重新对焦</strong>，区分失焦与残余像差。';
 if(a.pass<.999)msg+=' 部分采样光线未通过，指标只统计通过的光线；通光比例下降不能当成无代价的清晰度改善。';
 $('insight').innerHTML=msg;
 drawRays();drawSpot();drawFocus();drawTarget();drawDeparture();drawComparison();
 $('prescription').innerHTML='<table><thead><tr><th>面</th><th>顶点 z / mm</th><th>R / mm</th><th>k</th><th>介质变化</th></tr></thead><tbody>'+a.sys.surfaces.map((s,i)=>`<tr><td>${i+1}</td><td>${fmt(s.z,3)}</td><td>${s.c?fmt(1/s.c,6):'∞（平面）'}</td><td>${fmt(s.k,7)}</td><td>${s.from} → ${s.to}</td></tr>`).join('')+'</tbody></table>';
 $('validation').textContent='材料核对：n_d(N-BK7) = '+fmt(index('BK7',587.6),8)+'；n_d(N-F2) = '+fmt(index('F2',587.6),8)+'。验证记录见本站源文件 validation.md。';
}
function drawRays(){
 const a=current,W=1000,H=310,xmax=Math.max(122,a.z+14),X=z=>42+(z+13)/(xmax+13)*(W-78),Y=y=>H/2-y*8;
 let s=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#385067" stroke-opacity=".19" stroke-width="1"/></pattern><clipPath id="rayClip"><rect width="1000" height="310"/></clipPath></defs><rect width="1000" height="310" fill="url(#grid)"/><path d="M25 ${Y(0)}H975" stroke="#526376" stroke-width="1" stroke-dasharray="5 6"/>`;
 for(const e of a.sys.elements){const f=a.sys.surfaces[e.a],b=a.sys.surfaces[e.b];let pts=[];for(let i=0;i<=64;i++){const y=-13+i*26/64;pts.push([X(f.z+sag(f,Math.abs(y))),Y(y)]);}for(let i=64;i>=0;i--){const y=-13+i*26/64;pts.push([X(b.z+sag(b,Math.abs(y))),Y(y)]);}s+=`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${e.glass==='BK7'?'#61d6d6':'#be9ee5'}" fill-opacity=".17" stroke="${e.glass==='BK7'?'#77e4db':'#b8a1df'}" stroke-width="1.6"/>`;}
 s+='<g clip-path="url(#rayClip)">';for(const w of state.white?WAVES:[state.wl])for(let j=-4;j<=4;j++){const r=trace(a.sys,j*state.diam/8,0,w,state.field);if(!r)continue;const path=[...r.path,[xmax,r.a[0]+xmax*r.b[0],0]];s+=`<polyline points="${path.map(p=>X(p[0])+','+Y(p[1])).join(' ')}" fill="none" stroke="${color(w)}" stroke-opacity=".65" stroke-width="1.35"/>`;}
 s+='</g>';s+=`<line x1="${X(a.z)}" x2="${X(a.z)}" y1="36" y2="274" stroke="#dce9f5" stroke-width="2"/><text x="${X(a.z)-10}" y="25" text-anchor="end" fill="#dce9f5" font-size="15">传感器 z=${fmt(a.z,2)} mm</text><text x="${X(0)}" y="295" fill="#9fbdca" font-size="14">镜片 / z=0</text><text x="26" y="25" fill="#9fbdca" font-size="14">光从左向右传播</text>`;s+='</svg>';$('rayDiagram').innerHTML=s;
}
function canvas(id){const c=$(id),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#101a28';ctx.fillRect(0,0,c.width,c.height);ctx.font='13px -apple-system, sans-serif';ctx.lineWidth=1;return [ctx,c.width,c.height];}
function line(ctx,x1,y1,x2,y2,c,dash=[]){ctx.beginPath();ctx.setLineDash(dash);ctx.strokeStyle=c;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
function drawSpot(){
 const [c,W,H]=canvas('spot'),a=current,p=a.sp,center=[W/2,164],r=130,airy=1.22*.0005876*a.n;
 let half=$('scale').value==='auto'?Math.max(.01,...p.pts.map(q=>Math.hypot(q.x-p.cx,q.y-p.cy)*1.2),...(reference?reference.a.sp.pts.map(q=>Math.hypot(q.x-reference.a.sp.cx,q.y-reference.a.sp.cy)*1.2):[])):Number($('scale').value)/2;
 const k=r/half;for(let j=-2;j<=2;j++){line(c,center[0]-r,center[1]+j*r/2,center[0]+r,center[1]+j*r/2,'#283a4d');line(c,center[0]+j*r/2,center[1]-r,center[0]+j*r/2,center[1]+r,'#283a4d');}
 c.save();c.beginPath();c.rect(center[0]-r,center[1]-r,2*r,2*r);c.clip();
 if(reference){const q=reference.a.sp;c.strokeStyle='#f3f6fc55';for(let i=0;i<q.pts.length;i+=3){const t=q.pts[i];c.beginPath();c.arc(center[0]+(t.x-q.cx)*k,center[1]-(t.y-q.cy)*k,2,0,Math.PI*2);c.stroke();}}
 for(const q of p.pts){c.fillStyle=color(q.wl)+'99';c.beginPath();c.arc(center[0]+(q.x-p.cx)*k,center[1]-(q.y-p.cy)*k,1.3,0,Math.PI*2);c.fill();}
 c.strokeStyle='#b4c4d8';c.setLineDash([4,4]);c.beginPath();c.arc(...center,airy*k,0,Math.PI*2);c.stroke();c.setLineDash([]);c.restore();
 c.fillStyle='#becbd9';c.textAlign='center';c.fillText('−'+fmt(half*1000,1)+' μm',center[0]-r,321);c.fillText('0',center[0],321);c.fillText('+'+fmt(half*1000,1)+' μm',center[0]+r,321);c.textAlign='left';
 const outside=p.pts.filter(q=>Math.abs(q.x-p.cx)>half||Math.abs(q.y-p.cy)>half).length;
 $('spotnote').textContent=`${p.pts.length} 个采样落点；围绕总质心显示。虚线圆：黄光近轴衍射半径约 ${fmt(airy*1000,2)} μm（仅参考，未合成）。${outside?'当前窗口外有 '+outside+' 个点，请扩大范围。':''}`;
}
function drawFocus(){
 const [c,W,H]=canvas('focusplot'),a=current,focuses=[];
 for(const w of state.white?WAVES:[state.wl])for(const h of [.05,.4,.7,1]){const ray=trace(a.sys,state.diam/2*h,0,w,0);if(ray)focuses.push(-ray.a[0]/ray.b[0]);}
 let zmin=Math.min(...focuses),zmax=Math.max(...focuses),span=Math.max(.25,zmax-zmin),mid=(zmin+zmax)/2;zmin=mid-span*.7;zmax=mid+span*.7;
 const rays=[];for(const w of state.white?WAVES:[state.wl])for(const h of [-1,-.7,-.4,.4,.7,1]){const r=trace(a.sys,state.diam/2*h,0,w,0);if(r)rays.push(r);}
 const ymax=Math.max(.002,...rays.flatMap(r=>[Math.abs(r.a[0]+zmin*r.b[0]),Math.abs(r.a[0]+zmax*r.b[0])]))*1.1;
 const X=z=>62+(z-zmin)/(zmax-zmin)*(W-90),Y=y=>160-y/ymax*116;
 for(let j=-2;j<=2;j++)line(c,62,Y(j*ymax/2),W-28,Y(j*ymax/2),'#283a4d');
 for(const r of rays)line(c,X(zmin),Y(r.a[0]+zmin*r.b[0]),X(zmax),Y(r.a[0]+zmax*r.b[0]),color(r.wl));
 if(a.z>=zmin&&a.z<=zmax)line(c,X(a.z),30,X(a.z),280,'#dce8fa',[5,5]);else{c.fillStyle='#b5c3d5';c.fillText('当前传感器在放大范围外',66,24);}
 c.fillStyle='#b5c3d5';c.textAlign='center';for(let j=0;j<=2;j++){const z=zmin+j*(zmax-zmin)/2;c.fillText(fmt(z,3),X(z),307);}c.fillText('光轴位置 z / mm（范围自动放大）',W/2,336);c.textAlign='left';c.fillText('+'+fmt(ymax*1000,1)+' μm',7,32);
}
function drawTarget(){
 const [c,W,H]=canvas('target'),a=current,N=220,th=100,px=N,src=document.createElement('canvas');src.width=N;src.height=th;const sc=src.getContext('2d');sc.fillStyle='#fff';sc.fillRect(0,0,N,th);sc.fillStyle='#111';sc.font='bold 43px sans-serif';sc.fillText('光学',9,51);sc.font='bold 22px monospace';sc.fillText('OPTICS',10,83);for(let i=0;i<12;i++)sc.fillRect(125+i*7,12,i<6?3:1,76);const im=sc.getImageData(0,0,N,th),out=sc.createImageData(N,th),pts=a.sp.pts;
 // Histogram of exact subpixel landing offsets: bilinear deposition, then a discrete convolution.
 const kernel=new Map();for(const p of pts){const dx=(p.x-a.sp.cx)*px,dy=(p.y-a.sp.cy)*px,ix=Math.floor(dx),iy=Math.floor(dy),fx=dx-ix,fy=dy-iy;for(let i=0;i<2;i++)for(let j=0;j<2;j++){const key=(ix+i)+','+(iy+j),v=(i?fx:1-fx)*(j?fy:1-fy)/pts.length;kernel.set(key,(kernel.get(key)||0)+v);}}
 const taps=[...kernel].map(([key,v])=>[...key.split(',').map(Number),v]);const vals=new Float64Array(N*th);vals.fill(255);
 for(const [dx,dy,wt]of taps){if(Math.abs(dx)>=N||Math.abs(dy)>=th)continue;for(let y=Math.max(0,dy);y<Math.min(th,th+dy);y++)for(let x=Math.max(0,dx);x<Math.min(N,N+dx);x++){vals[y*N+x]+=wt*(im.data[((y-dy)*N+x-dx)*4]-255);}}
 for(let i=0;i<vals.length;i++){out.data[i*4]=out.data[i*4+1]=out.data[i*4+2]=vals[i];out.data[i*4+3]=255;}const dst=document.createElement('canvas');dst.width=N;dst.height=th;dst.getContext('2d').putImageData(out,0,0);
 c.fillStyle='#b7c8d8';c.font='15px sans-serif';c.fillText('理想输入',45,29);c.fillText('当前几何成像',450,29);c.drawImage(src,45,45,345,157);c.drawImage(dst,450,45,345,157);c.fillStyle='#8599ad';c.font='12px sans-serif';c.fillText('对照与结果同尺度；采用亚像素光斑核',45,232);
}
function drawDeparture(){
 const [c,W,H]=canvas('departure'),s={c:-1/50,k:state.mode==='asphere'?state.k:ideal},base={...s,k:0},points=Array.from({length:101},(_,i)=>{const r=i*.1;return [r,(sag(s,r)-sag(base,r))*1000];}),max=Math.max(1,...points.map(p=>Math.abs(p[1]))),X=r=>58+r/10*(W-85),Y=v=>H-40-v/max*(H-75);
 for(let i=0;i<=2;i++)line(c,58,Y(i*max/2),W-27,Y(i*max/2),'#293d50');c.beginPath();c.strokeStyle='#79e4d2';for(const [r,v]of points)c.lineTo(X(r),Y(v));c.stroke();c.fillStyle='#abbcd0';c.fillText('Δz / μm',12,20);c.fillText(fmt(max,2),12,43);c.fillText('0',37,H-36);c.fillText('0',X(0),H-15);c.fillText('5',X(5),H-15);c.fillText('10 mm（半径）',X(10)-95,H-15);$('departureNote').textContent=`出射面与同顶点曲率球面的面形差；k=${fmt(s.k,5)}，半径 10 mm 处相差 ${fmt(points.at(-1)[1],3)} μm。面形差单独放大，不能按图上幅度理解实际镜片厚度。`;
}
function drawComparison(){
 $('clear').hidden=!reference;$('comparison').hidden=!reference;if(!reference)return;
 const a=reference.a,b=current;const rows=[['结构',names[reference.state.mode]+' / '+a.sys.elements.length+' 片',names[state.mode]+' / '+b.sys.elements.length+' 片'],['直径 / 视场',fmt(reference.state.diam,1)+' mm / '+reference.state.field+'°',fmt(state.diam,1)+' mm / '+state.field+'°'],['光源',reference.state.white?'三色等权':reference.state.wl+' nm',state.white?'三色等权':state.wl+' nm'],['有效焦距 / f 值',fmt(a.efl,2)+' / '+fmt(a.n,2),fmt(b.efl,2)+' / '+fmt(b.n,2)],['几何 RMS 半径',mic(a.sp.rms*1000)+' μm',mic(b.sp.rms*1000)+' μm'],['红蓝近轴焦点差',mic(a.fc*1000)+' μm',mic(b.fc*1000)+' μm'],['传感器 z',fmt(a.z)+' mm',fmt(b.z)+' mm']];
 $('comparison').innerHTML='<div class="tablewrap"><table><thead><tr><th>指标</th><th>已记录的对照</th><th>当前</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(s=>'<td>'+s+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="hint">光斑数值可以比较，但焦距、光圈或光源改变时，不构成严格同条件的镜头优劣排名。</p>';
}
function setMode(mode){state.mode=mode;state.removeNegative=false;state.sameGlass=false;state.extra=false;state.gap=0;if(mode==='asphere')state.k=ideal;update();}
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));
for(const id of ['diam','field','k','gap','sensor'])$(id).addEventListener('input',e=>{state[id]=Number(e.target.value);if(id==='sensor')state.auto=false;update();});
for(const id of ['removeNegative','sameGlass','extra','auto'])$(id).addEventListener('change',e=>{state[id]=e.target.checked;update();});
$('light').addEventListener('change',e=>{state.white=e.target.value==='white';if(!state.white)state.wl=Number(e.target.value);update();});
$('scale').addEventListener('change',drawSpot);$('idealK').addEventListener('click',()=>{state.k=ideal;update();});
$('focus').addEventListener('click',()=>{state.sensor=current.best;update();});
$('pin').addEventListener('click',()=>{reference={state:{...state},a:current};drawComparison();drawSpot();});$('clear').addEventListener('click',()=>{reference=null;drawComparison();drawSpot();});
$('reset').addEventListener('click',()=>{state={...defaults};reference=null;$('scale').value='.5';update();});
$('mobileToggle').addEventListener('click',()=>{const p=document.querySelector('.controls'),on=p.classList.toggle('expanded');$('mobileToggle').textContent=on?'收起调节 −':'展开调节 ＋';$('mobileToggle').setAttribute('aria-expanded',String(on));});
for(const b of document.querySelectorAll('[data-experiment]'))b.addEventListener('click',()=>{state={...defaults};reference=null;const e=b.dataset.experiment;if(e==='spherical'||e==='aperture')state.white=false;if(e==='glass'||e==='count')state.mode='doublet';update();reference={state:{...state},a:current};drawComparison();drawSpot();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
update();
