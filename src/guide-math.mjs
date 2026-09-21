export function geometry(f=35,N=1.8,s=2000,c=.03){
 const v=f*s/(s-f),D=f/N,t=c/(D*v),near=1/(1/s+t),far=1/s>t?1/(1/s-t):Infinity;
 return {f,N,s,c,v,D,near,far,m:v/s,hyperfocal:f*f/(N*c)+f,view:2*Math.atan(36/(2*f))*180/Math.PI,bg:D*v*Math.abs(1/20000-1/s)};
}
export function opticalMTF(q){if(q<0)q=-q;if(q>=1)return 0;return 2/Math.PI*(Math.acos(q)-q*Math.sqrt(1-q*q));}
export function diffraction(N=8,lambdaNm=550,pixelUm=4){const l=lambdaNm/1e6;return {diameter:2.44*l*N*1000,radius:1.22*l*N*1000,cutoff:1/(l*N),nyquist:1000/(2*pixelUm),pixel:p=>Math.abs(p===0?1:Math.sin(Math.PI*pixelUm/1000*p)/(Math.PI*pixelUm/1000*p))};}
// Numerical Recipes / rational approximations of Bessel J1, adequate for plot display.
export function j1(x){const a=Math.abs(x);let y,ans;if(a<8){y=x*x;ans=x*(72362614232+y*(-7895059235+y*(242396853.1+y*(-2972611.439+y*(15704.4826+y*(-30.16036606))))))/(144725228442+y*(2300535178+y*(18583304.74+y*(99447.43394+y*(376.9991397+y)))));}else{const z=8/a;y=z*z;const xx=a-2.356194491,A=1+y*(.00183105+y*(-.00003516396496+y*(.000002457520174+y*(-.000000240337019)))),B=.04687499995+y*(-.0002002690873+y*(.000008449199096+y*(-.00000088228987+y*.000000105787412)));ans=Math.sqrt(.636619772/a)*(Math.cos(xx)*A-z*Math.sin(xx)*B);if(x<0)ans=-ans;}return ans;}
export function airy(r,lambdaN){if(r===0)return 1;const x=Math.PI*r/lambdaN;return (2*j1(x)/x)**2;}
