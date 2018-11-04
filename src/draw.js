function drawModel(renderState, {proj, viewmtx, invviewmtx}, model, type, colour, alpha) {
  const {gl, shaderProgram, pointsShader, tex_board, tex_pieceshadow, board, sphere} = renderState;

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

function drawScene(renderState, gameState) {
  const {gl, glCanvas} = renderState;
  const {viewInfo} = gameState;

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

  const boardModelMatrix = (() => {
    const model = mat4.create();
    mat4.translate(model, model, vec3.fromValues(0, 0, 0));
    return model;
  })();

  // gridx/gridy are positions from 0-14 inclusive
  const getPieceModelMatrix = (gridx, gridy, z) => {
    const [mx, my] = getWorldPosFromGridPos(gridx, gridy);
    const model = mat4.create();
    mat4.translate(model, model, vec3.fromValues(mx, my, z));
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
  drawModel(renderState, viewInfo, boardModelMatrix, 'board');

  // gl.depthMask(gl.FALSE);
  // draw shadows
  gl.disable(gl.DEPTH_TEST);
  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      const value = getGridState(gameState, gx, gy);
      if (value !== null) {
        drawModel(renderState, viewInfo, getPieceModelMatrix(gx, gy, 0), 'pieceshadow');
      }
    }
  }
  gl.enable(gl.DEPTH_TEST);

  // draw pieces
  // gl.enable(gl.DEPTH_TEST);
  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      const value = getGridState(gameState, gx, gy);
      if (value !== null) {
        drawModel(renderState, viewInfo, getPieceModelMatrix(gx, gy, piece_z), 'piece', colours[value], 1.0);
      }
    }
  }

  // place tile at mouse pos -> snapped grid loc
  if (gameState.nextPieceColour !== null && gameState.mouse_gridPos !== null) {
    drawModel(renderState, viewInfo, getPieceModelMatrix(gameState.mouse_gridPos[0], gameState.mouse_gridPos[1], piece_z), 'piece', colours[gameState.nextPieceColour], 0.3);
  }
}
