function getProjectionMatrix({glCanvas}) {
  const fovy = 45 * Math.PI / 180.0;
  const far = 1000;
  const near = 0.01;

  const y = Math.tan(fovy / 2);
  const aspect = glCanvas.width / glCanvas.height;

  const ymax = near * y;
  const xmax = ymax * aspect;
  const ymin = -ymax;
  const xmin = -xmax;

  function myPerspective(out) {
    const znear = near;
    const zfar = far;
    out[0*4+0] = (2 * znear) / (xmax - xmin);
    out[1*4+0] = 0;
    out[2*4+0] = (xmax + xmin) / (xmax - xmin);
    out[3*4+0] = 0;
    out[0*4+1] = 0;
    out[1*4+1] = (2 * znear) / (ymax - ymin);
    out[2*4+1] = (ymax + ymin) / (ymax - ymin);
    out[3*4+1] = 0;
    out[0*4+2] = 0;
    out[1*4+2] = 0;
    out[2*4+2] = -(zfar + znear) / (zfar - znear);
    out[3*4+2] = -(2 * zfar * znear) / (zfar - znear);
    out[0*4+3] = 0;
    out[1*4+3] = 0;
    out[2*4+3] = -1;
    out[3*4+3] = 0;
  }

  const proj = mat4.create();
  myPerspective(proj);

  return {
    xmin, xmax, ymin, ymax,
    near, far,
    proj,
  };
}

// take world coordinates and convert to grid (0-14) inclusive
// or null if off the grid
function getGridPos(wx, wy) {
  const marginFrac = boardConfig.imageMargin / boardConfig.imageDim;
  const d0 = boardConfig.worldDim * -0.5 + marginFrac;
  const d1 = boardConfig.worldDim * 0.5 - marginFrac;
  let gridx = (boardConfig.numLines - 1) * (wx - d0) / (d1 - d0);
  let gridy = (boardConfig.numLines - 1) * (wy - d0) / (d1 - d0);
  gridx = Math.round(gridx);
  gridy = Math.round(gridy);
  if (gridx >= 0 && gridy >= 0 && gridx < boardConfig.numLines && gridy < boardConfig.numLines) {
    return [gridx, gridy];
  } else {
    return null;
  }
}

// gridx/gridy are positions from 0-14 inclusive
// opposite of getGridPos
function getWorldPosFromGridPos(gridx, gridy) {
  const marginFrac = boardConfig.imageMargin / boardConfig.imageDim;
  const d0 = boardConfig.worldDim * -0.5 + marginFrac;
  const d1 = boardConfig.worldDim * 0.5 - marginFrac;
  const mx = d0 + (d1 - d0) * gridx / (boardConfig.numLines - 1);
  const my = d0 + (d1 - d0) * gridy / (boardConfig.numLines - 1);
  return [mx, my];
}

function getViewMatrix(cameraAngle) {
  const viewmtx = mat4.create();
  if (cameraAngle === 'default') {
    mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.57, 1.1));
    mat4.rotate(viewmtx, viewmtx, 25 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
  } else if (cameraAngle === 'straight-down') {
    mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, 0.03, 1.3));
  } else {
    mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.85, 0.4));
    mat4.rotate(viewmtx, viewmtx, 60 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
  }
  return viewmtx;
}

// return world space
function projectMousePos(gameState, {glCanvas, viewmtx, xmin, xmax, ymin, ymax, near}) {
  const mx = gameState.mousePos[0] / (glCanvas.width - 1);
  const my = gameState.mousePos[1] / (glCanvas.height - 1);

  const eyepos = vec3.create();
  mat4.getTranslation(eyepos, viewmtx);
  const right = vec3.fromValues(viewmtx[0], viewmtx[1], viewmtx[2]);
  const up = vec3.fromValues(viewmtx[4], viewmtx[5], viewmtx[6]);
  const back = vec3.fromValues(viewmtx[8], viewmtx[9], viewmtx[10]);


  const left = vec3.create();
  vec3.scale(left, right, -1);
  const forward = vec3.create();
  vec3.scale(forward, back, -1);

    //TODO there's probably a way easier way to get this off the projection matrix
    // and not need xmin/xmax/etc
  //
    const eye_origin = vec3.clone(eyepos);

    const m_x = xmin + (1 - mx) * (xmax - xmin);
    const m_y = ymin + (1 - my) * (ymax - ymin);

    // now project mouse position onto nearclip plane
    const fwd2 = vec3.create(); vec3.scale(fwd2, forward, near);
    vec3.add(eyepos, eyepos, fwd2);
    const left2 = vec3.create(); vec3.scale(left2, left, m_x);
    vec3.add(eyepos, eyepos, left2);
    const up2 = vec3.create(); vec3.scale(up2, up, m_y);
    vec3.add(eyepos, eyepos, up2);

    const ray_direction = vec3.create();
    vec3.sub(ray_direction, eyepos, eye_origin);
    vec3.normalize(ray_direction, ray_direction);
  //

  const n = vec3.fromValues(0, 0, 1); // plane normal
  const d = 0; // plane distance (along plane normal) from world origin
  const l0 = eyepos; // ray origin
  const l = vec3.clone(ray_direction); // ray normal

  const s = vec3.dot(n, l);
  const t = (d - vec3.dot(n, l0)) / s;
  // c is the mouse position projected onto the board's plane.
  const c = vec3.fromValues(
    l0[0] + l[0] * t,
    l0[1] + l[1] * t,
    l0[2] + l[2] * t,
  );
  return c;
}
