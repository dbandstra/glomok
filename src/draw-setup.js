function drawSetup(glCanvas, gl) {
  const boardShaderProgram = buildShaderProgram(gl, [
    {type: gl.VERTEX_SHADER, source: boardVertexShader},
    {type: gl.FRAGMENT_SHADER, source: boardFragmentShader},
  ]);
  const boardShader = {
    program: boardShaderProgram,
    uniforms: {
      uTex: gl.getUniformLocation(boardShaderProgram, 'uTex'),
      uColour: gl.getUniformLocation(boardShaderProgram, 'uColour'),
      uModelViewProjection: gl.getUniformLocation(boardShaderProgram, 'uModelViewProjection'),
    },
    attributes: {
      aVertexPosition: gl.getAttribLocation(boardShaderProgram, 'aVertexPosition'),
      aTexCoord: gl.getAttribLocation(boardShaderProgram, 'aTexCoord'),
    }
  };

  const pieceShaderProgram = buildShaderProgram(gl, [
    {type: gl.VERTEX_SHADER, source: pieceVertexShader},
    {type: gl.FRAGMENT_SHADER, source: pieceFragmentShader},
  ]);
  const pieceShader = {
    program: pieceShaderProgram,
    uniforms: {
      uGlobalColor: gl.getUniformLocation(pieceShaderProgram, 'uGlobalColor'),
      uLightNormal0: gl.getUniformLocation(pieceShaderProgram, 'uLightNormal0'),
      uLightNormal1: gl.getUniformLocation(pieceShaderProgram, 'uLightNormal1'),
      uEyePosition: gl.getUniformLocation(pieceShaderProgram, 'uEyePosition'),
      uModelViewProjection: gl.getUniformLocation(pieceShaderProgram, 'uModelViewProjection'),
    },
    attributes: {
      aVertexPosition: gl.getAttribLocation(pieceShaderProgram, 'aVertexPosition'),
      aVertexNormal: gl.getAttribLocation(pieceShaderProgram, 'aVertexNormal'),
    },
  };

  const board = (() => {
    const z = 0;
    // TODO - use boardConfig.worldDim
    const vertexArray = new Float32Array([
      // triangle 1
      -0.5, 0.5, z, 0.5, 0.5, z, 0.5, -0.5, z,
      // triangle 2
      -0.5, 0.5, z, 0.5, -0.5, z, -0.5, -0.5, z,
    ]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    const texCoordArray = new Float32Array([
      0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
      0.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    ]);
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoordArray, gl.STATIC_DRAW);
    return {
      vertexBuffer,
      vertexNumComponents: 3,
      vertexCount: vertexArray.length / 3,
      texCoordBuffer,
    };
  })();

  const tex_board = uploadTexture(gl, makeTextureImage(boardConfig));
  const tex_pieceshadow = uploadTexture(gl, makeTextureImagePieceShadow());

  const sphere = (() => {
    const {vertexArray, normalsArray, indicesArray, numTriangles} = makePieceMesh();
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
    const normalsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normalsArray, gl.STATIC_DRAW);
    const elementBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesArray, gl.STATIC_DRAW);
    return {
      vertexBuffer,
      vertexNumComponents: 3,
      vertexCount: vertexArray.length / 3,
      normalsBuffer,
      elementBuffer,
      numTriangles,
    };
  })();

  const renderState = {
    glCanvas,
    gl,
    boardShader,
    pieceShader,
    tex_board,
    tex_pieceshadow,
    board,
    sphere,
  };

  return renderState;
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

function buildShaderProgram(gl, shaderInfo) {
  const program = gl.createProgram();

  shaderInfo.forEach(function (desc) {
    const shader = compileShader(gl, desc.source, desc.type);

    if (shader) {
      gl.attachShader(program, shader);
    }
  });

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Error linking shader program:');
    console.log(gl.getProgramInfoLog(program));
  }

  return program;
}

function compileShader(gl, source, type) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(`Error compiling ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader:`);
    console.log(gl.getShaderInfoLog(shader));
  }

  return shader;
}
