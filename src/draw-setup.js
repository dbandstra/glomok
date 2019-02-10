import {makeBoardMesh, makeBoardSideMesh} from './meshes/board';
import {makePieceMesh} from './meshes/piece';
import {boardFragmentShader, boardVertexShader, pieceFragmentShader, pieceVertexShader} from './shaders';
import {makeBoardTexture, makeBoardSideTexture} from './tex-board';
import {makeTextureImagePieceShadow} from './tex-pieceshadow';

export function drawSetup(glCanvas, gl, boardConfig) {
  return {
    glCanvas,
    gl,
    boardShader: uploadShader(gl, {
      vertex: boardVertexShader,
      fragment: boardFragmentShader,
      uniforms: ['uTex', 'uColour', 'uModelViewProjection'],
      attributes: ['aVertexPosition', 'aTexCoord'],
    }),
    pieceShader: uploadShader(gl, {
      vertex: pieceVertexShader,
      fragment: pieceFragmentShader,
      uniforms: ['uGlobalColor', 'uLightNormal0', 'uLightNormal1', 'uEyePosition', 'uModelViewProjection'],
      attributes: ['aVertexPosition', 'aVertexNormal'],
    }),
    tex_board: uploadTexture(gl, makeBoardTexture(boardConfig)),
    tex_boardside: uploadTexture(gl, makeBoardSideTexture(boardConfig)),
    tex_pieceshadow: uploadTexture(gl, makeTextureImagePieceShadow()),
    board: uploadMesh(gl, makeBoardMesh(boardConfig)),
    boardside: uploadMesh(gl, makeBoardSideMesh(boardConfig)),
    sphere: uploadMesh(gl, makePieceMesh()),
  };
}

function uploadShader(gl, {vertex, fragment, uniforms, attributes}) {
  const program = gl.createProgram();

  for (let [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ]) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(`Error compiling ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader:`);
      console.log(gl.getShaderInfoLog(shader));
      throw new Error('shader compilation failed');
    }

    gl.attachShader(program, shader);
  }

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Error linking shader program:');
    console.log(gl.getProgramInfoLog(program));
    throw new Error('shader link failed');
  }

  return {
    program,
    uniforms: uniforms.reduce((pv, uniformName) => Object.assign(pv, {
      [uniformName]: gl.getUniformLocation(program, uniformName),
    }), {}),
    attributes: attributes.reduce((pv, attributeName) => Object.assign(pv, {
      [attributeName]: gl.getAttribLocation(program, attributeName),
    }), {}),
  };
}

function uploadTexture(gl, {w, h, pixels, fmt}) {
  // use anisotropic filtering if available. if it's not available,
  // disable mipmapping

  let ext =
    gl.getExtension('EXT_texture_filter_anisotropic') ||
    gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  // ext = null;

  const glFmt = (() => {
    switch (fmt) {
      case 'rgb': return gl.RGB;
      case 'rgba': return gl.RGBA;
      default:
        throw new Error('uploadTexture: bad fmt:', fmt);
    }
  })();

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, ext ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, glFmt, w, h, 0, glFmt, gl.UNSIGNED_BYTE, pixels);
  if (ext) {
    gl.generateMipmap(gl.TEXTURE_2D);
    const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
  }
  return tex;
}

function uploadMesh(gl, {vertexArray, normalArray, texCoordArray, elementArray}) {
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

  const normalBuffer = normalArray && gl.createBuffer() || null;
  if (normalBuffer !== null) {
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normalArray, gl.STATIC_DRAW);
  }

  const texCoordBuffer = texCoordArray && gl.createBuffer() || null;
  if (texCoordBuffer !== null) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoordArray, gl.STATIC_DRAW);
  }

  const elementBuffer = elementArray && gl.createBuffer() || null;
  if (elementBuffer !== null) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementArray, gl.STATIC_DRAW);
  }

  return {
    vertexBuffer,
    vertexNumComponents: 3,
    vertexCount: vertexArray.length / 3,
    normalBuffer,
    texCoordBuffer,
    elementBuffer,
    numTriangles: elementArray ? elementArray.length / 3 : 0,
  };
}
