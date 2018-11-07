function getProjectionMatrix({glCanvas}) {
  const fovy = 45 * Math.PI / 180.0;
  const far = 1000;
  const near = 0.01;

  const ymax = near * Math.tan(fovy / 2);
  const xmax = ymax * glCanvas.width / glCanvas.height;
  const ymin = -ymax;
  const xmin = -xmax;

  const proj = mat4.create();

  proj[0*4+0] = (2 * near) / (xmax - xmin);
  proj[1*4+0] = 0;
  proj[2*4+0] = (xmax + xmin) / (xmax - xmin);
  proj[3*4+0] = 0;
  proj[0*4+1] = 0;
  proj[1*4+1] = (2 * near) / (ymax - ymin);
  proj[2*4+1] = (ymax + ymin) / (ymax - ymin);
  proj[3*4+1] = 0;
  proj[0*4+2] = 0;
  proj[1*4+2] = 0;
  proj[2*4+2] = -(far + near) / (far - near);
  proj[3*4+2] = -(2 * far * near) / (far - near);
  proj[0*4+3] = 0;
  proj[1*4+3] = 0;
  proj[2*4+3] = -1;
  proj[3*4+3] = 0;

  return proj;
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

// get the position of the mouse in worldspace, on the board plane
function unprojectMousePos(gameState, {glCanvas, viewmtx, proj}) {
  // math from http://antongerdelan.net/opengl/raycasting.html

  // get starting point of mouse "ray" (eye pos in worldspace)
  const eyePos = vec3.create();
  mat4.getTranslation(eyePos, viewmtx);

  // get direction of mouse ray
  const mx = gameState.mousePos[0] / (glCanvas.width - 1);
  const my = 1 - gameState.mousePos[1] / (glCanvas.height - 1);
  const ray_clip = vec4.fromValues(mx * 2 - 1, my * 2 - 1, -1, 1);
  // transform from clipspace to camera space
  const invProj = mat4.create();
  mat4.invert(invProj, proj);
  const ray_eye = vec4.create();
  vec4.transformMat4(ray_eye, ray_clip, invProj);
  ray_eye[2] = -1;
  ray_eye[3] = 0;
  // transform from camera space to worldspace
  const ray_wor = vec4.create();
  vec4.transformMat4(ray_wor, ray_eye, viewmtx);
  const eyeDir = vec3.fromValues(ray_wor[0], ray_wor[1], ray_wor[2]);
  vec3.normalize(eyeDir, eyeDir);

  // intersect with board plane
  const boardPlaneNormal = vec3.fromValues(0, 0, 1);
  const boardPlaneDist = 0;

  return _intersectRayVsPlane(
    eyePos,
    eyeDir,
    boardPlaneNormal,
    boardPlaneDist,
  );
}

function _intersectRayVsPlane(rayPos, rayDir, planeNormal, planeDist) {
  const s = vec3.dot(planeNormal, rayDir);
  const t = (planeDist - vec3.dot(planeNormal, rayPos)) / s;

  const result = vec3.create();
  vec3.scale(result, rayDir, t);
  vec3.add(result, result, rayPos);
  return result;
}
