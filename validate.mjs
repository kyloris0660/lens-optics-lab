import assert from 'node:assert/strict';
import {analyse,makeSystem,trace,index,bundle,bestFocus,spot} from './src/optics.mjs';
const checks=[];function test(name,fn){fn();checks.push(name);}
test('SCHOTT d-line indices',()=>{assert(Math.abs(index('BK7',587.6)-1.5168)<3e-6);assert(Math.abs(index('F2',587.6)-1.62005)<3e-6);});
test('Analytic paraxial focal length',()=>assert(Math.abs(analyse({mode:'sphere'}).efl-50/(index('BK7',587.6)-1))<1e-5));
test('Exact single-wavelength on-axis asphere',()=>{const a=analyse({mode:'asphere'});assert(a.sp.rms<1e-9);assert(Math.abs(a.z-(5+50/(index('BK7',587.6)-1)))<1e-7);});
test('Asphere retains material dispersion',()=>assert(analyse({mode:'asphere',white:true}).sp.rms>.04));
test('Doublet paraxial f and F/C coincidence',()=>{const a=analyse({mode:'doublet',white:true});assert(Math.abs(a.efl-100)<1e-6);assert(a.fc<1e-6);assert(a.sp.rms<.005);});
test('Same glass loses achromat correction',()=>assert(analyse({mode:'doublet',sameGlass:true}).fc>1));
test('Stop-down trend',()=>assert(analyse({mode:'sphere',diam:5}).sp.rms<analyse({mode:'sphere',diam:20}).sp.rms/10));
test('Focus is local centroid RMS minimum',()=>{const a=analyse({mode:'doublet',field:3,white:true});assert(a.sp.rms<=spot(a.rays,a.z+.1).rms);assert(a.sp.rms<=spot(a.rays,a.z-.1).rms);});
test('Rotational symmetry',()=>{const s=makeSystem({mode:'doublet'}),a=trace(s,3,4),b=trace(s,0,5);assert(Math.abs(Math.hypot(...a.d.slice(1))-Math.hypot(...b.d.slice(1)))<1e-12);});
let cases=0;
test('198 representative UI boundary cases',()=>{for(const mode of ['sphere','asphere','doublet'])for(const diam of [2,10,20])for(const field of [0,2.5,5])for(const white of [false,true])for(const m of mode==='doublet'?[{},{removeNegative:true},{extra:true},{sameGlass:true},{gap:10},{gap:.5},{removeNegative:true,extra:true}]:mode==='asphere'?[{k:0},{k:-4},{}]:[{}]){const a=analyse({mode,diam,field,white,...m});assert(Number.isFinite(a.sp.rms)&&Number.isFinite(a.z));assert(a.pass>.99);assert(a.z>25&&a.z<140);cases++;}});
test('384 vs 1536 rays per wavelength convergence',()=>{for(const mode of ['sphere','asphere','doublet'])for(const white of [false,true]){const a=analyse({mode,white,diam:20,field:0}),r=bundle(a.sys,20,0,white?[486.1,587.6,656.3]:[587.6],1536);assert(Math.abs(spot(r,bestFocus(r)).rms-a.sp.rms)<Math.max(1e-9,a.sp.rms*.005));}});
console.log(JSON.stringify({passed:checks,cases},null,2));
