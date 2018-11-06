function drawModelSetup({proj, viewmtx, invviewmtx}, model) {
  const modelView = mat4.create();
  mat4.multiply(modelView, invviewmtx, model);

  const modelViewProjection = mat4.create();
  mat4.multiply(modelViewProjection, proj, modelView);

// this matrix will take something from worldspace to local space for the shader
// actually i'm not sure if it's correct. inverting the model matrix is good.
// not sure if this is the right way to deal with camera matrix though.
const argh = mat4.create();
mat4.invert(argh, modelView);

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

  return {
    modelView,
    modelViewProjection,
    eyePos: eyepos3,
    lightNormal0: getLightNormal(lightnormal0),
    lightNormal1: getLightNormal(lightnormal1),
  };
}

function _drawBoard(renderState, setupInfo, boardParams) {
  const {gl, boardShader, board} = renderState;
  const {modelViewProjection} = setupInfo;
  const {texture, colour} = boardParams;

  gl.useProgram(boardShader.program);

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.uniform1i(boardShader.uniforms.uTex, 0);
  gl.uniform4fv(boardShader.uniforms.uColour, colour);
  gl.uniformMatrix4fv(boardShader.uniforms.uModelViewProjection, false, modelViewProjection);

  gl.bindBuffer(gl.ARRAY_BUFFER, board.vertexBuffer);
  gl.enableVertexAttribArray(boardShader.attributes.aVertexPosition);
  gl.vertexAttribPointer(boardShader.attributes.aVertexPosition, board.vertexNumComponents, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, board.texCoordBuffer);
  gl.enableVertexAttribArray(boardShader.attributes.aTexCoord);
  gl.vertexAttribPointer(boardShader.attributes.aTexCoord, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, board.vertexCount);
}

function drawBoard(renderState, setupInfo) {
  _drawBoard(renderState, setupInfo, {
    texture: renderState.tex_board,
    colour: vec4.fromValues(1, 1, 1, 1),
  });
}

function drawPieceShadow(renderState, setupInfo, {isGlowing}) {
  _drawBoard(renderState, setupInfo, {
    texture: renderState.tex_pieceshadow,
    colour: isGlowing
      ? vec4.fromValues(1, 0, 0, 1)
      : vec4.fromValues(0, 0, 0, 1),
  });
}

function drawPiece(renderState, setupInfo, {colour, alpha}) {
  const {gl, pieceShader, sphere} = renderState;
  const {modelView, modelViewProjection, eyePos, lightNormal0, lightNormal1} = setupInfo;

  gl.useProgram(pieceShader.program);

  gl.uniformMatrix4fv(pieceShader.uniforms.uModelView, false, modelView);
  gl.uniformMatrix4fv(pieceShader.uniforms.uModelViewProjection, false, modelViewProjection);
  gl.uniform4fv(pieceShader.uniforms.uGlobalColor, vec4.fromValues(colour[0], colour[1], colour[2], alpha));
  gl.uniform3fv(pieceShader.uniforms.uLightNormal0, lightNormal0);
  gl.uniform3fv(pieceShader.uniforms.uLightNormal1, lightNormal1);
  gl.uniform3fv(pieceShader.uniforms.uEyePosition, eyePos);

  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertexBuffer);
  gl.enableVertexAttribArray(pieceShader.attributes.aVertexPosition);
  gl.vertexAttribPointer(pieceShader.attributes.aVertexPosition, sphere.vertexNumComponents, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normalsBuffer);
  gl.enableVertexAttribArray(pieceShader.attributes.aVertexNormal);
  gl.vertexAttribPointer(pieceShader.attributes.aVertexNormal, sphere.vertexNumComponents, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.elementBuffer);
  gl.drawElements(gl.TRIANGLES, 3 * sphere.numTriangles, gl.UNSIGNED_SHORT, 0);
}

function drawScene(renderState, gameState) {
  const {gl, glCanvas} = renderState;
  const {viewInfo} = gameState;

  gl.colorMask(true, true, true, true);
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(1, 1, 1, 1);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // disable alpha writing. this works around a difference between webgl and opengl
  // that i don't really understand... other workarounds include passing the option
  // {premultipliedAlpha: false} to canvas.getContext (doesn't work in chrome,
  // apparently) and setting style="background: black" on the canvas element.
  // more info here:
  // https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
  gl.colorMask(true, true, true, false);

  // gridx/gridy are positions from 0-14 inclusive
  const getPieceModelMatrix = (gridx, gridy, z) => {
    const [mx, my] = getWorldPosFromGridPos(gridx, gridy);
    const model = mat4.create();
    mat4.translate(model, model, vec3.fromValues(mx, my, z));
    // TODO - add on to board model matrix
    return model;
  };

  const colours = {
    'white': [0.95, 0.95, 0.95],
    'black': [0.2, 0.2, 0.2],
  };

  // draw board
  gl.enable(gl.DEPTH_TEST);
  const mtx = mat4.create();
  const setupInfo = drawModelSetup(viewInfo, mtx);
  drawBoard(renderState, setupInfo);

  // draw shadows
  gl.disable(gl.DEPTH_TEST);
  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      const value = gameState.getGridState(gx, gy);
      if (value !== null) {
        const mtx = getPieceModelMatrix(gx, gy, 0);
        if (value.isGlowing) {
          const scale = (0.03 / 0.5) * 2;
          mat4.scale(mtx, mtx, vec3.fromValues(scale, scale, scale));
        } else {
          const scale = (0.03 / 0.5) * 1.55;
          mat4.scale(mtx, mtx, vec3.fromValues(scale, scale, scale));
        }
        const setupInfo = drawModelSetup(viewInfo, mtx);
        drawPieceShadow(renderState, setupInfo, {
          isGlowing: value.isGlowing,
        });
      }
    }
  }
  gl.enable(gl.DEPTH_TEST);

  // draw pieces

  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      const value = gameState.getGridState(gx, gy);
      if (value !== null) {
        const mtx = getPieceModelMatrix(gx, gy, 0.005);
        const setupInfo = drawModelSetup(viewInfo, mtx);
        drawPiece(renderState, setupInfo, {
          colour: colours[value.colour],
          alpha: 1.0,
        });
      }
    }
  }

  // place translucent tile at mouse pos -> snapped grid loc
  if (gameState.nextPieceColour !== null && gameState.mouse_gridPos !== null) {
    const mtx = getPieceModelMatrix(gameState.mouse_gridPos[0], gameState.mouse_gridPos[1], 0.005);
    const setupInfo = drawModelSetup(viewInfo, mtx);
    drawPiece(renderState, setupInfo, {
      colour: colours[gameState.nextPieceColour],
      alpha: 0.3,
    });
  }
}
