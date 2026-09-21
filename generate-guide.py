"""Reproducible scalar Fourier-optics teaching assets. Not product measurements."""
import json
from pathlib import Path
import numpy as np
from scipy.signal import fftconvolve
from scipy.special import j1
from PIL import Image, ImageDraw, ImageFont
from matplotlib import colormaps, font_manager

OUT=Path(__file__).parent/'src/guide-assets'
OUT.mkdir(exist_ok=True)
N=512; P=128
x=(np.arange(N)-N//2)/(P/2)
X,Y=np.meshgrid(x,x);r2=X*X+Y*Y;mask=r2<=1
def psf(w):
 pupil=mask*np.exp(2j*np.pi*w)
 p=np.abs(np.fft.fftshift(np.fft.fft2(np.fft.ifftshift(pupil))))**2
 return p/p.sum()
ideal=psf(np.zeros_like(X));peak=ideal.max()
z={'defocus':np.sqrt(3)*(2*r2-1),'spherical':np.sqrt(5)*(6*r2*r2-6*r2+1),'coma':np.sqrt(8)*(3*r2-2)*X,'astigmatism':np.sqrt(6)*(X*X-Y*Y)}
# Infinite black surroundings, finite grayscale resolution chart.
im=Image.new('L',(512,256),0);d=ImageDraw.Draw(im)
font=ImageFont.truetype(font_manager.findfont('DejaVu Sans'),42)
d.text((25,12),'OPTICS  0123',fill=220,font=font)
for j in range(6):
 spacing=[24,16,12,8,5,3][j]
 for k in range(0,68,spacing):d.rectangle((22+j*81+k,90,22+j*81+k+max(1,spacing//2)-1,162),fill=240)
for y0 in [191,224]:
 for i in range(9):
  rr=2 if y0==191 else 5;cx=30+i*54;d.ellipse((cx-rr,y0-rr,cx+rr,y0+rr),fill=240)
target=np.array(im)/255
Image.fromarray(np.uint8(target*255)).save(OUT/'target.png')
cases={};allpsfs={}
for typ in ['ideal',*z,'astig-near','astig-far']:
 for level in ([0] if typ=='ideal' else [.08,.2,.4]):
  if typ=='ideal':w=np.zeros_like(X)
  elif typ.startswith('astig-'):w=level*z['astigmatism']+(-1 if typ=='astig-near' else 1)*level*z['defocus']*.7
  else:w=level*z[typ]
  p=psf(w);key=typ if typ=='ideal' else typ+'-'+str(level)
  # Shared log exposure with ideal reference. Cropped images remain same physical scale.
  q=p[216:297,216:297];v=np.clip((np.log10(np.maximum(q/peak,1e-4))+4)/4,0,1)
  Image.fromarray(np.uint8(colormaps['inferno'](v)[:,:,:3]*255)).resize((405,405),Image.Resampling.NEAREST).save(OUT/(key+'-psf.png'))
  # Odd 511 kernel centered at original FFT DC pixel, avoids even-kernel half-pixel displacement.
  ker=p[1:,1:];retained=ker.sum();ker=ker/retained
  image=fftconvolve(target,ker,mode='same')
  Image.fromarray(np.uint8(np.clip(image,0,1)*255)).save(OUT/(key+'-image.png'))
  wf=w[192:321,192:321];valid=mask[192:321,192:321]
  c=colormaps['coolwarm'](np.clip((wf+1.6)/3.2,0,1))[:,:,:3];c[~valid]=[.063,.102,.157]
  Image.fromarray(np.uint8(c*255)).resize((320,320),Image.Resampling.NEAREST).save(OUT/(key+'-wave.png'))
  var=np.var(w[mask]);cases[key]={'peakRatio':float(p.max()/peak),'rmsWaves':float(np.sqrt(var)),'energy':float(p.sum()),'kernelRetainedEnergy':float(retained)}
  allpsfs[key]=p
# Validate perfect circular-pupil radial profile against analytic Airy at matched physical coordinates.
rr=np.arange(1,41)*P/N
theory=(2*j1(np.pi*rr)/(np.pi*rr))**2
numeric=ideal[N//2,N//2+1:N//2+41]/peak
err=float(np.max(np.abs(theory-numeric)))
assert err<.004,err
assert all(abs(v['energy']-1)<1e-12 for v in cases.values())
assert cases['ideal']['peakRatio']==1
for typ in z:assert cases[typ+'-0.08']['peakRatio']>cases[typ+'-0.4']['peakRatio']
meta={'model':'scalar Fraunhofer, incoherent image intensity convolution; uniform circular pupil','wavelength_nm':550,'f_number':4,'image_pixel_um':.55,'psf_panel_width_um':44.55,'target_width_um':281.6,'FFT_size':N,'pupil_diameter_pixels':P,'PSF_display':'shared log10 ideal-peak-relative intensity, -4 to 0 decades','wave_display':'fixed -1.6 to +1.6 waves','cases':cases,'airy_profile_max_absolute_error':err}
(OUT/'model.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print(json.dumps({'assets':len(list(OUT.iterdir())),'airy_error':err,'cases':len(cases)}))
