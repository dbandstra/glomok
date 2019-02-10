export const boardVertexShader = `
attribute vec3 aVertexPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelViewProjection;

varying vec3 vPosition;
varying vec2 vTexCoord;

void main() {
  gl_Position = uModelViewProjection * vec4(aVertexPosition, 1.0);
  vPosition = aVertexPosition;
  vTexCoord = aTexCoord;
}
`;

export const boardFragmentShader = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D uTex;
uniform vec4 uColour;

varying vec3 vPosition;
varying vec2 vTexCoord;

void main() {
  vec4 colour = texture2D(uTex, vTexCoord) * uColour;

  // this vignette effect was intended for the board, but it gets applied to
  // pieceshadows too... oh well, they still look fine
  float f = 1.0 - min(1.0, length(vPosition) / 2.5);

  gl_FragColor.rgb = colour.rgb * f;
  gl_FragColor.a = colour.a;
}
`;
