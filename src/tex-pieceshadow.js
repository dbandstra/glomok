export function makeTextureImagePieceShadow() {
  const w = 64;
  const h = 64;
  const pixels = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x / (w - 1) * 2 - 1;
      const dy = y / (h - 1) * 2 - 1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let alpha = Math.max(0, 1 - dist);
      if (alpha < 0) alpha = 0; if (alpha > 1) alpha = 1;
      alpha = (() => {
        const x = alpha;
        // cubic hermite curve
        // return x * x * (3 - 2 * x);
        // quintic hermite curve
        // return x * x * x * (x * (x * 6 - 15) + 10);
        // faster than perlin quintic. i think this one is the blackest....
        const x3 = x*x*x; return (7 + (x3 - 7) * x) * x3;
        // C1
        // return 1 - Math.pow(1 - x * x, 2);
      })();
      const i = y * w + x;
      pixels[i * 4 + 0] = 255;
      pixels[i * 4 + 1] = 255;
      pixels[i * 4 + 2] = 255;
      pixels[i * 4 + 3] = Math.floor(alpha * 255 + 0.5);
    }
  }
  return {w, h, pixels, fmt: 'rgba'};
}
// https://briansharpe.wordpress.com/2011/11/14/two-useful-interpolation-functions-for-noise-development/

/*//    Quintic Hermite Curve.  As used by Perlin in Improved Noise.  http://mrl.nyu.edu/~perlin/paper445.pdf
//    6x^5-15x^4+10x^3
float Interpolation_C2( float x ) { return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); }

//    Faster than Perlin Quintic.  Not quite as good shape.
//    7x^3-7x^4+x^7
float Interpolation_C2_Fast( float x ) { float x3 = x*x*x; return ( 7.0 + ( x3 - 7.0 ) * x ) * x3; }

//    C3 Interpolation function.  If anyone ever needs it... : )
//    25x^4-48x^5+25x^6-x^10
float Interpolation_C3( float x ) { float xsq = x*x; float xsqsq = xsq*xsq; return xsqsq * ( 25.0 - 48.0 * x + xsq * ( 25.0 - xsqsq ) ); }*/


/*//
//  For interest here are some smooth interpolation functions defined in x-squared
//
//  C1:      f(x) = 1.0 - ( 1.0 - x*x )^2
//  C2:      f(x) = 9x^4-16x^6+9x^8-x^12
//  C2 Fast: f(x) = 5x^4-5x^6+x^10  or  f(x) = 3x^4-3x^8+x^12
//  C3:      f(x) = 10x^4-20x^6+15x^8-4x^10*/
