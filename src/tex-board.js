export function makeTextureImage(boardConfig) {
  const w = boardConfig.imageDim;
  const h = boardConfig.imageDim;
  const margin = boardConfig.imageMargin; // number of pixels around the grid (actually distance to centre of outer grid line)
  const line_radius = 0; // line width will be (1 + 2 * line_radius) pixels
  const dot_radius = 3;
  const dot_feather_radius = 0;
  const num_lines = boardConfig.numLines;
  const border_width = 1;

  const pixels = new Uint8Array(w * h * 3);
  // background fill
  for (let i = 0; i < w * h; i++) {
    pixels[i * 3 + 0] = 238;
    pixels[i * 3 + 1] = 209;
    pixels[i * 3 + 2] = 165;
  }
  // outer border
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < border_width; y++) {
      for (let i = 0; i < 3; i++) {
        pixels[(y * w + x) * 3 + i] = 0;
      }
    }
    for (let y = h - border_width; y < h; y++) {
      for (let i = 0; i < 3; i++) {
        pixels[(y * w + x) * 3 + i] = 0;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < border_width; x++) {
      for (let i = 0; i < 3; i++) {
        pixels[(y * w + x) * 3 + i] = 0;
      }
    }
    for (let x = w - border_width; x < w; x++) {
      for (let i = 0; i < 3; i++) {
        pixels[(y * w + x) * 3 + i] = 0;
      }
    }
  }
  // grid
  for (let gy = 0; gy < num_lines; gy++) {
    const gpy = margin + Math.round(gy * (h - 2 * margin) / (num_lines - 1));
    const y0 = Math.max(gpy - line_radius, 0);
    const y1 = Math.min(gpy + line_radius, h - 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = margin; x < w - margin; x++) {
        const i = y * w + x;
        pixels[i * 3 + 0] = 0;
        pixels[i * 3 + 1] = 0;
        pixels[i * 3 + 2] = 0;
      }
    }
  }
  for (let gx = 0; gx < num_lines; gx++) {
    const gpx = margin + Math.round(gx * (w - 2 * margin) / (num_lines - 1));
    const x0 = Math.max(gpx - line_radius, 0);
    const x1 = Math.min(gpx + line_radius, w - 1);
    for (let x = x0; x <= x1; x++) {
      for (let y = margin; y < h - margin; y++) {
        const i = y * w + x;
        pixels[i * 3 + 0] = 0;
        pixels[i * 3 + 1] = 0;
        pixels[i * 3 + 2] = 0;
      }
    }
  }
  function drawDot(dot_x, dot_y) {
    const outer_radius = dot_radius + dot_feather_radius;
    for (let y = -outer_radius; y <= outer_radius; y++) {
      for (let x = -outer_radius; x <= outer_radius; x++) {
        const i = (dot_y + y) * w + (dot_x + x);
        const dist2 = Math.sqrt(x * x + y * y) - Math.sqrt(dot_radius * dot_radius);
        if (dist2 < -dot_feather_radius) {
          pixels[i * 3 + 0] = 0;
          pixels[i * 3 + 1] = 0;
          pixels[i * 3 + 2] = 0;
        } else if (dist2 < dot_feather_radius) {
          const frac = (dist2 + dot_feather_radius) / (dot_feather_radius * 2);
          pixels[i * 3 + 0] = Math.floor(pixels[i * 3 + 0] * frac + 0.5);
          pixels[i * 3 + 1] = Math.floor(pixels[i * 3 + 1] * frac + 0.5);
          pixels[i * 3 + 2] = Math.floor(pixels[i * 3 + 2] * frac + 0.5);
        }
      }
    }
  }
  const dots = [
    [7, 7],
    [3, 3],
    [3, 11],
    [11, 3],
    [11, 11],
  ];
  dots.forEach(([x, y]) => {
    drawDot(
      Math.round(margin + (w - 2 * margin) * x / (num_lines - 1)),
      Math.round(margin + (h - 2 * margin) * y / (num_lines - 1)),
    );
  });
  return {w, h, pixels, fmt: 'rgb'};
}
