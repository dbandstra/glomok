const boardVertexShader = `
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

const boardFragmentShader = `
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

const pieceVertexShader = `
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;

uniform mat4 uModelViewProjection;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  gl_Position = uModelViewProjection * vec4(aVertexPosition, 1.0);
  vNormal = aVertexNormal;
  vPosition = aVertexPosition;
}
`;

const pieceFragmentShader = `
#ifdef GL_ES
  precision highp float;
#endif

uniform vec4 uGlobalColor;
uniform vec3 uLightNormal0;
uniform vec3 uLightNormal1;
uniform vec3 uEyePosition;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);

  float diffuse = dot(uLightNormal0, normal);
  diffuse = diffuse * 0.7 + 0.3;
  diffuse = max(0.0, diffuse) * 0.5 + 0.5;

  vec3 reflectedLightNormal0 = 2.0 * normal * dot(normal, uLightNormal0) - uLightNormal0;
  vec3 reflectedLightNormal1 = 2.0 * normal * dot(normal, uLightNormal1) - uLightNormal1;

  vec3 eyeNormal = normalize(uEyePosition - vPosition);

  float d;

  d = max(0.0, dot(eyeNormal, reflectedLightNormal0));
  vec3 spec0 = vec3(0.5, 0.5, 0.45) * pow(d, 32.0);

  d = max(0.0, dot(eyeNormal, reflectedLightNormal1));
  vec3 spec1 = vec3(0.3) * pow(d, 32.0);

  vec4 colour = uGlobalColor;
  gl_FragColor = vec4(colour.rgb * diffuse + spec0 + spec1, colour.a);
}
`;
