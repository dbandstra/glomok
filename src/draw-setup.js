function drawSetup(gl) {
  shaderProgram = buildShaderProgram([
    {type: gl.VERTEX_SHADER, source: boardVertexShader},
    {type: gl.FRAGMENT_SHADER, source: boardFragmentShader},
  ]);

  pointsShader = buildShaderProgram([
    {type: gl.VERTEX_SHADER, source: pieceVertexShader},
    {type: gl.FRAGMENT_SHADER, source: pieceFragmentShader},
  ]);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // gl.disable(gl.BLEND);

  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CW);

  {
    const z = 0;
    // TODO - use boardConfig.worldDim
    const vertexArray = new Float32Array([
      // triangle 1
      -0.5, 0.5, z, 0.5, 0.5, z, 0.5, -0.5, z,
      // triangle 2
      -0.5, 0.5, z, 0.5, -0.5, z, -0.5, -0.5, z,
    ]);
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
    vertexNumComponents = 3;
    vertexCount = vertexArray.length / vertexNumComponents;

    const texCoordArray = new Float32Array([
      0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
      0.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    ]);
    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoordArray, gl.STATIC_DRAW);
    board = {
      vertexBuffer,
      vertexNumComponents: 3,
      vertexCount: vertexArray.length / 3,
      texCoordBuffer,
    };
  }

  tex_board = uploadTexture(makeTextureImage(boardConfig));
  tex_pieceshadow = uploadTexture(makeTextureImagePieceShadow());

  {
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
    sphere = {
      vertexBuffer,
      vertexNumComponents: 3,
      vertexCount: vertexArray.length / 3,
      normalsBuffer,
      elementBuffer,
      numTriangles,
    };
  }
}

function uploadTexture({w, h, pixels, fmt}) {
  // use anisotropic filtering if available. if it's not available,
  // disable mipmapping

  let ext =
    gl.getExtension('EXT_texture_filter_anisotropic') ||
    gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  // ext = null;

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, ext ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, fmt, gl.UNSIGNED_BYTE, pixels);
  if (ext) {
    gl.generateMipmap(gl.TEXTURE_2D);
    const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
  }
  return tex;
}

function buildShaderProgram(shaderInfo) {
  const program = gl.createProgram();

  shaderInfo.forEach(function (desc) {
    const shader = compileShader(desc.source, desc.type);

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

function compileShader(source, type) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(`Error compiling ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader:`);
    console.log(gl.getShaderInfoLog(shader));
  }

  return shader;
}
