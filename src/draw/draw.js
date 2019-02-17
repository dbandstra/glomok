import {mat4, vec3, vec4} from 'gl-matrix';

import {getWorldPosFromGridPos} from './view';

// there are two light sources. they are infinitely distant, thus specified by
// directions rather than by positions. the direction points "backward" (hence
// the name "light normal").
// the first light contributes diffuse and specular lighting, the second is
// only specular (see the shader).
const LIGHT_NORMAL_0 = vec3.fromValues(-0.5, -0.5, 1);
const LIGHT_NORMAL_1 = vec3.fromValues(0, 2, 1);

function drawModelSetup({proj, viewmtx, invviewmtx}, model) {
  const modelView = mat4.create();
  mat4.multiply(modelView, invviewmtx, model);

  const modelViewProjection = mat4.create();
  mat4.multiply(modelViewProjection, proj, modelView);

  const invModel = mat4.create();
  mat4.invert(invModel, model);

  const eyePos = vec3.create();
  mat4.getTranslation(eyePos, viewmtx);
  vec3.transformMat4(eyePos, eyePos, invModel);

  const transformLightNormal = (wsDirection) => {
    const wsNormal = vec3.create();
    vec3.normalize(wsNormal, wsDirection);
    const msNormal4 = vec4.fromValues(wsNormal[0], wsNormal[1], wsNormal[2], 0);
    vec4.transformMat4(msNormal4, msNormal4, invModel);
    return vec3.fromValues(msNormal4[0], msNormal4[1], msNormal4[2]);
  };

  return {
    modelViewProjection,
    // the following have all been transformed into model space
    eyePos,
    lightNormal0: transformLightNormal(LIGHT_NORMAL_0),
    lightNormal1: transformLightNormal(LIGHT_NORMAL_1),
  };
}

function _drawBoard(renderState, setupInfo, boardParams) {
  const {gl, boardShader} = renderState;
  const {modelViewProjection} = setupInfo;
  const {mesh, texture, colour} = boardParams;

  gl.useProgram(boardShader.program);

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.uniform1i(boardShader.uniforms.uTex, 0);
  gl.uniform4fv(boardShader.uniforms.uColour, colour);
  gl.uniformMatrix4fv(boardShader.uniforms.uModelViewProjection, false, modelViewProjection);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
  gl.enableVertexAttribArray(boardShader.attributes.aVertexPosition);
  gl.vertexAttribPointer(boardShader.attributes.aVertexPosition, mesh.vertexNumComponents, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoordBuffer);
  gl.enableVertexAttribArray(boardShader.attributes.aTexCoord);
  gl.vertexAttribPointer(boardShader.attributes.aTexCoord, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
}

function drawBoard(renderState, setupInfo, showSide) {
  _drawBoard(renderState, setupInfo, {
    mesh: renderState.board,
    texture: renderState.tex_board,
    colour: vec4.fromValues(1, 1, 1, 1),
  });
  if (showSide) {
    _drawBoard(renderState, setupInfo, {
      mesh: renderState.boardside,
      texture: renderState.tex_boardside,
      colour: vec4.fromValues(1, 1, 1, 1),
    });
  }
}

function drawPieceShadow(renderState, setupInfo, {isGlowing}) {
  _drawBoard(renderState, setupInfo, {
    mesh: renderState.board,
    texture: renderState.tex_pieceshadow,
    colour: isGlowing
      ? vec4.fromValues(1, 0, 0, 1)
      : vec4.fromValues(0, 0, 0, 1),
  });
}

function drawPiece(renderState, setupInfo, {colour, alpha}) {
  const {gl, pieceShader, sphere} = renderState;
  const {modelViewProjection, eyePos, lightNormal0, lightNormal1} = setupInfo;

  gl.useProgram(pieceShader.program);

  gl.uniformMatrix4fv(pieceShader.uniforms.uModelViewProjection, false, modelViewProjection);
  gl.uniform4fv(pieceShader.uniforms.uGlobalColor, vec4.fromValues(colour[0], colour[1], colour[2], alpha));
  gl.uniform3fv(pieceShader.uniforms.uLightNormal0, lightNormal0);
  gl.uniform3fv(pieceShader.uniforms.uLightNormal1, lightNormal1);
  gl.uniform3fv(pieceShader.uniforms.uEyePosition, eyePos);

  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertexBuffer);
  gl.enableVertexAttribArray(pieceShader.attributes.aVertexPosition);
  gl.vertexAttribPointer(pieceShader.attributes.aVertexPosition, sphere.vertexNumComponents, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normalBuffer);
  gl.enableVertexAttribArray(pieceShader.attributes.aVertexNormal);
  gl.vertexAttribPointer(pieceShader.attributes.aVertexNormal, sphere.vertexNumComponents, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.elementBuffer);
  gl.drawElements(gl.TRIANGLES, 3 * sphere.numTriangles, gl.UNSIGNED_SHORT, 0);
}

export function drawScene(renderState, gameParams) {
  const {gl, glCanvas} = renderState;
  const {viewInfo, boardConfig, myColour, getColourAtGridPos, winningPieces, hoverGridPos} = gameParams;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CW);

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
    const [mx, my] = getWorldPosFromGridPos(boardConfig, gridx, gridy);
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
  drawBoard(renderState, setupInfo, viewInfo.cameraAngle === 'too-steep');

  // draw shadows
  gl.disable(gl.DEPTH_TEST);
  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      if (getColourAtGridPos(gx, gy) !== null) {
        const isGlowing = !!(winningPieces || []).find((wp) => wp[0] === gx && wp[1] === gy);
        const mtx = getPieceModelMatrix(gx, gy, 0);
        if (isGlowing) {
          const scale = (0.03 / 0.5) * 2;
          mat4.scale(mtx, mtx, vec3.fromValues(scale, scale, scale));
        } else {
          const scale = (0.03 / 0.5) * 1.55;
          mat4.scale(mtx, mtx, vec3.fromValues(scale, scale, scale));
        }
        const setupInfo = drawModelSetup(viewInfo, mtx);
        drawPieceShadow(renderState, setupInfo, {isGlowing});
      }
    }
  }
  gl.enable(gl.DEPTH_TEST);

  // draw pieces

  for (let gy = 0; gy < boardConfig.numLines; gy++) {
    for (let gx = 0; gx < boardConfig.numLines; gx++) {
      const colour = getColourAtGridPos(gx, gy);
      if (colour !== null) {
        const mtx = getPieceModelMatrix(gx, gy, 0.005);
        const setupInfo = drawModelSetup(viewInfo, mtx);
        drawPiece(renderState, setupInfo, {
          colour: colours[colour],
          alpha: 1.0,
        });
      }
    }
  }

  // place translucent tile at mouse pos -> snapped grid loc
  if (hoverGridPos !== null && myColour !== null) {
    const mtx = getPieceModelMatrix(hoverGridPos[0], hoverGridPos[1], 0.005);
    const setupInfo = drawModelSetup(viewInfo, mtx);
    drawPiece(renderState, setupInfo, {
      colour: colours[myColour],
      alpha: 0.3,
    });
  }
}
