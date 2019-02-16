const r = 0.5;
const b = -r * 2 / 32; // z coordinate of bottom (top is z=0)

export function makeBoardMesh(boardConfig) {
  return {
    // TODO - use boardConfig.worldDim?
    vertexArray: new Float32Array([
      // top face:
      -r, r, 0, r, r, 0, r, -r, 0,
      -r, r, 0, r, -r, 0, -r, -r, 0,
    ]),
    texCoordArray: new Float32Array([
      0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
      0.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    ]),
  };
}

export function makeBoardSideMesh(boardConfig) {
  return {
    vertexArray: new Float32Array([
      // side facing the camera:
      -r, -r, 0, r, -r, 0, r, -r, b,
      -r, -r, 0, r, -r, b, -r, -r, b,
    ]),
    texCoordArray: new Float32Array([
      0.0, 1.0, 1.0, 1.0, 1.0, 0.0,
      0.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    ]),
  };
}
