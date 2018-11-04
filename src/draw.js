function drawModel({proj, viewmtx, invviewmtx}, model, type, colour, alpha) {
  model = mat4.clone(model);
  if (type === 'pieceshadow') {
    // the 1.55 is a phony boost value
    const scale = (0.03 / 0.5) * 1.55;
    mat4.scale(model, model, vec3.fromValues(scale, scale, scale));
  }

  const modelview = mat4.create();
  mat4.multiply(modelview, invviewmtx, model);

  const combined_matrix = mat4.create();
  mat4.multiply(combined_matrix, proj, modelview);

// this matrix will take something from worldspace to local space for the shader
// actually i'm not sure if it's correct. inverting the model matrix is good.
// not sure if this is the right way to deal with camera matrix though.
const argh = mat4.create();
mat4.invert(argh, modelview);

const eyepos = vec3.create();
mat4.getTranslation(eyepos, viewmtx);
const eyepos4 = vec4.fromValues(eyepos[0], eyepos[1], eyepos[2], 1.0);
vec4.transformMat4(eyepos4, eyepos4, argh);
const eyepos3 = vec3.fromValues(eyepos4[0], eyepos4[1], eyepos4[2]);

  // const lightnormal0 = vec3.fromValues(0, 0, 1);
  const lightnormal0 = vec3.fromValues(0.3, 0.5, 1.0);
  // const lightnormal0 = vec3.fromValues(0, -1, 0);

  const lightnormal1 = vec3.fromValues(0, 30, -5);

  const getLightNormal = (lightnormal) => {
    vec3.normalize(lightnormal, lightnormal);
    const ln = vec4.fromValues(lightnormal[0], lightnormal[1], lightnormal[2], 0.0);
    vec4.transformMat4(ln, ln, argh);
    const ln3 = vec3.fromValues(ln[0], ln[1], ln[2]);
    return ln3;
  };

  switch (type) {
    case 'board':
      (() => {
        gl.useProgram(shaderProgram);

        const uTex = gl.getUniformLocation(shaderProgram, 'uTex');
        const uModelViewProjection = gl.getUniformLocation(shaderProgram, 'uModelViewProjection');

        gl.bindTexture(gl.TEXTURE_2D, tex_board);

        gl.uniform1i(uTex, 0);
        gl.uniformMatrix4fv(uModelViewProjection, false, combined_matrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, board.vertexBuffer);
        const aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, board.vertexNumComponents, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, board.texCoordBuffer);
        const aTexCoord = gl.getAttribLocation(shaderProgram, 'aTexCoord');
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, board.vertexCount);
      })();
      break;
    case 'pieceshadow':
      (() => {
        gl.useProgram(shaderProgram);

        const uTex = gl.getUniformLocation(shaderProgram, 'uTex');
        const uModelViewProjection = gl.getUniformLocation(shaderProgram, 'uModelViewProjection');

        gl.bindTexture(gl.TEXTURE_2D, tex_pieceshadow);

        gl.uniform1i(uTex, 0);
        gl.uniformMatrix4fv(uModelViewProjection, false, combined_matrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, board.vertexBuffer);
        const aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, board.vertexNumComponents, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, board.texCoordBuffer);
        const aTexCoord = gl.getAttribLocation(shaderProgram, 'aTexCoord');
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, board.vertexCount);
      })();
      break;
    case 'piece':
      (() => {
        gl.useProgram(pointsShader);
        const uGlobalColor = gl.getUniformLocation(pointsShader, 'uGlobalColor');
        const uLightNormal0 = gl.getUniformLocation(pointsShader, 'uLightNormal0');
        const uLightNormal1 = gl.getUniformLocation(pointsShader, 'uLightNormal1');
        const uEyePosition = gl.getUniformLocation(pointsShader, 'uEyePosition');
        const uModelView = gl.getUniformLocation(pointsShader, 'uModelView');
        const uModelViewProjection = gl.getUniformLocation(pointsShader, 'uModelViewProjection');
        gl.uniformMatrix4fv(uModelView, false, modelview);
        gl.uniformMatrix4fv(uModelViewProjection, false, combined_matrix);
        gl.uniform4fv(uGlobalColor, vec4.fromValues(colour[0], colour[1], colour[2], alpha));
        gl.uniform3fv(uLightNormal0, getLightNormal(lightnormal0));
        gl.uniform3fv(uLightNormal1, getLightNormal(lightnormal1));
        gl.uniform3fv(uEyePosition, eyepos3);
        gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertexBuffer);
        const aVertexPosition = gl.getAttribLocation(pointsShader, 'aVertexPosition');
        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, sphere.vertexNumComponents, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normalsBuffer);
        const aVertexNormal = gl.getAttribLocation(pointsShader, 'aVertexNormal');
        gl.enableVertexAttribArray(aVertexNormal);
        gl.vertexAttribPointer(aVertexNormal, sphere.vertexNumComponents, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.elementBuffer);
        gl.drawElements(gl.TRIANGLES, 3 * sphere.numTriangles, gl.UNSIGNED_SHORT, 0);
      })();
      break;
  }
}

function drawScene() {
  gl.colorMask(true, true, true, true);
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0.8, 0.9, 1.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // disable alpha writing. this works around a difference between webgl and opengl
  // that i don't really understand... other workarounds include passing the option
  // {premultipliedAlpha: false} to canvas.getContext (doesn't work in chrome,
  // apparently) and setting style="background: black" on the canvas element.
  // more info here:
  // https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
  gl.colorMask(true, true, true, false);

  const fovy = 45 * Math.PI / 180.0;
  const far = 1000;//Infinity;
  const near = 0.01;

  // calc bounds
  const y = Math.tan(fovy / 2);// * (3 / 4);
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



  const viewmtx = (() => {
    const viewmtx = mat4.create();
    if (false) {
      // mat4.rotate(viewmtx, viewmtx, currentAngle * Math.PI / 180.0, vec3.fromValues(0, 0, 1));
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.6, 1.1));
      mat4.rotate(viewmtx, viewmtx, 25 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    } else if (true) {
      // mat4.rotate(viewmtx, viewmtx, currentAngle * Math.PI / 180.0, vec3.fromValues(0, 0, 1));
      // mat4.rotate(viewmtx, viewmtx, 45 * Math.PI / 180.0, vec3.fromValues(0, 0, 1));
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.85, 0.4));
      mat4.rotate(viewmtx, viewmtx, 60 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    } else if (false) {
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.6, 0.2));
      mat4.rotate(viewmtx, viewmtx, 75 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    } else {
      mat4.rotate(viewmtx, viewmtx, currentAngle * Math.PI / 180.0, vec3.fromValues(0, 0, 1));
      mat4.translate(viewmtx, viewmtx, vec3.fromValues(0, -0.6, 0.05));

      mat4.rotate(viewmtx, viewmtx, 90 * Math.PI / 180.0, vec3.fromValues(1, 0, 0));
    }
    return viewmtx;
  })();

  const invviewmtx = mat4.create();
  mat4.invert(invviewmtx, viewmtx);


  // project mouse position into world space?!
  const mx = mousePos[0] / (glCanvas.width - 1);
  const my = mousePos[1] / (glCanvas.height - 1);

  const eyepos = vec3.create();
  mat4.getTranslation(eyepos, viewmtx);
  const right = vec3.fromValues(viewmtx[0], viewmtx[1], viewmtx[2]);
  const up = vec3.fromValues(viewmtx[4], viewmtx[5], viewmtx[6]);
  const back = vec3.fromValues(viewmtx[8], viewmtx[9], viewmtx[10]);


  const left = vec3.create();
  vec3.scale(left, right, -1);
  const forward = vec3.create();
  vec3.scale(forward, back, -1);

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




  const info = {
    proj,
    viewmtx,
    invviewmtx,
  };

  const boardModelMatrix = (() => {
    const model = mat4.create();
    mat4.translate(model, model, vec3.fromValues(0, 0, 0));
    return model;
  })();

  // take world coordinates and convert to grid (0-14) inclusive
  // or null if off the grid
  const getGridPos = (wx, wy) => {
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
  };

  // gridx/gridy are positions from 0-14 inclusive
  // opposite of getGridPos
  const getPieceModelMatrix = (gridx, gridy, z) => {
    const marginFrac = boardConfig.imageMargin / boardConfig.imageDim;
    const d0 = boardConfig.worldDim * -0.5 + marginFrac;
    const d1 = boardConfig.worldDim * 0.5 - marginFrac;
    const mx = d0 + (d1 - d0) * gridx / (boardConfig.numLines - 1);
    const my = d0 + (d1 - d0) * gridy / (boardConfig.numLines - 1);
    const model = mat4.create();
    mat4.translate(model, model, vec3.fromValues(mx, my, z));
      // mat4.rotate(model, model, currentAngle*Math.PI/180, vec3.fromValues(0, 1, 0));
    // TODO - add on to board model matrix
    return model;
  };

  const cg = g=>[g,g,g];
  const colours = {
    'white': cg(0.95),
    'black': cg(0.2),
  };
  const piece_z = 0.005;

  // gl.depthMask(gl.TRUE);
  // gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.DEPTH_TEST);
  drawModel(info, boardModelMatrix, 'board');

  // gl.depthMask(gl.FALSE);
  // draw shadows
  gl.disable(gl.DEPTH_TEST);
  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      const value = getGridState(gx, gy);
      if (value !== null) {
        drawModel(info, getPieceModelMatrix(gx, gy, 0), 'pieceshadow');
      }
    }
  }
  gl.enable(gl.DEPTH_TEST);

  // draw pieces
  // gl.enable(gl.DEPTH_TEST);
  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      const value = getGridState(gx, gy);
      if (value !== null) {
        drawModel(info, getPieceModelMatrix(gx, gy, piece_z), 'piece', colours[value], 1.0);
      }
    }
  }

  mouse_gridPos = getGridPos(c[0], c[1]);

  if (nextPieceColour !== null) {
    if (false) {
      // place tile at exact mouse pos (no grid snapping)
      const m = mat4.create();
      mat4.translate(m, m, c);
      mat4.translate(m, m, vec3.fromValues(0, 0, 0.005));
      drawModel(info, m, 'piece', colours[nextPieceColour]);
    } else {
      // place tile at mouse pos -> snapped grid loc
      if (mouse_gridPos !== null) {
        drawModel(info, getPieceModelMatrix(mouse_gridPos[0], mouse_gridPos[1], piece_z), 'piece', colours[nextPieceColour], 0.3);
      }
    }
  }
}
