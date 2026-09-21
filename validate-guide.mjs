import assert from 'node:assert/strict';
import fs from 'node:fs';
import {geometry,diffraction,opticalMTF,airy,j1} from './src/guide-math.mjs';
const g=geometry(50,2,2000,.03);
assert(Math.abs(g.D-25)<1e-12);
assert(Math.abs(g.v-51.282051282051285)<1e-10);
assert(Math.abs(1/g.s+1/g.v-1/g.f)<1e-12);
for(const u of [g.near,g.far])assert(Math.abs(g.D*g.v*Math.abs(1/u-1/g.s)-g.c)<1e-12);
assert(Math.abs(geometry(35,1.2,2000).m-geometry(50,1.8,2000*50/35).m)<1e-12);
const d=diffraction(8,550,4);
assert(Math.abs(d.diameter-10.736)<1e-10);assert(d.nyquist===125);
assert(opticalMTF(0)===1);assert(opticalMTF(1)===0);
assert(Math.abs(opticalMTF(.5)-.3910022189557707)<1e-12);
assert(airy(0,4.4)===1);assert(airy(1.21966989*4.4,4.4)<1e-12);
assert(Math.abs(j1(1)-.4400505857449335)<1e-8);
assert(Math.abs(j1(10)-.0434727461688614)<1e-8);
const meta=JSON.parse(fs.readFileSync('src/guide-assets/model.json'));
assert(meta.airy_profile_max_absolute_error<.004);
for(const [key,v]of Object.entries(meta.cases)){
 assert(Math.abs(v.energy-1)<1e-12);assert(v.peakRatio<=1.00001);
 for(const t of ['wave','psf','image'])assert(fs.existsSync(`src/guide-assets/${key}-${t}.png`));
}
console.log('PASS: lens equation, entrance pupil, DOF boundaries, matched magnification, Airy diameter/zero, Bessel values, MTF values, pixel Nyquist, 19 normalized Fourier cases/assets.');
