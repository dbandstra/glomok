function makeTextureImage(boardConfig) {
  const w = boardConfig.imageDim;
  const h = boardConfig.imageDim;
  const margin = boardConfig.imageMargin; // number of pixels around the grid (actually distance to centre of outer grid line)
  const line_radius = 1; // line width will be (1 + 2 * line_radius) pixels
  const dot_radius = 8;
  const num_lines = boardConfig.numLines;
  const pixels = new Uint8Array(w * h * 3);
  // background fill
  for (let i = 0; i < w * h; i++) {
    pixels[i * 3 + 0] = 184;
    pixels[i * 3 + 1] = 168;
    pixels[i * 3 + 2] = 168;
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
    for (let y = -dot_radius; y <= dot_radius; y++) {
      for (let x = -dot_radius; x <= dot_radius; x++) {
        if (x * x + y * y <= dot_radius * dot_radius) {
          const i = (dot_y + y) * w + (dot_x + x);
          pixels[i * 3 + 0] = 0;
          pixels[i * 3 + 1] = 0;
          pixels[i * 3 + 2] = 0;
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
