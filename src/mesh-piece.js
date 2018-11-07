function makePieceMesh() {
  const horz_radius = 0.03;
  const vert_radius = 0.01;

  const num_verts_around = 32;
  const num_y_verts = 16;

  const num_vertices = 2 + num_verts_around * (num_y_verts - 2);

  const vertexArray = new Float32Array(num_vertices * 3);

  let i = 0;

  vertexArray[i * 3 + 0] = 0;
  vertexArray[i * 3 + 1] = 0;
  vertexArray[i * 3 + 2] = -vert_radius;
  i++;
  for (let vy = 1; vy < num_y_verts - 1; vy++) {
    const z = -1 + 2 * vy / (num_y_verts - 1);
    const slice_radius = Math.sqrt(1 - z * z) * horz_radius;
    for (let vr = 0; vr < num_verts_around; vr++) {
      const rad = (vr / num_verts_around) * 2 * Math.PI;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      vertexArray[i * 3 + 0] = c * slice_radius;
      vertexArray[i * 3 + 1] = s * slice_radius;
      vertexArray[i * 3 + 2] = z * vert_radius;
      i++;
    }
  }
  vertexArray[i * 3 + 0] = 0;
  vertexArray[i * 3 + 1] = 0;
  vertexArray[i * 3 + 2] = vert_radius;
  i++;

  if (i !== num_vertices) {
    console.error('bug in sphere mesh vertices generation');
  }

  const num_triangles = 2 * num_verts_around + (num_y_verts - 3) * num_verts_around * 2;

  const elementArray = new Uint16Array(num_triangles * 3);

  i = 0;

  // bottom cone
  for (let r = 0; r < num_verts_around; r++) {
    elementArray[i * 3 + 0] = 0;
    elementArray[i * 3 + 1] = 1 + r;
    elementArray[i * 3 + 2] = 1 + (r + 1) % num_verts_around;
    i++;
  }
  // stacks
  for (let y = 0; y < num_y_verts - 3; y++) {
    const v0_index = 1 + y * num_verts_around;
    const v1_index = 1 + (y + 1) * num_verts_around;
    for (let r = 0; r < num_verts_around; r++) {
      elementArray[i * 3 + 0] = v0_index + r;
      elementArray[i * 3 + 1] = v1_index + r;
      elementArray[i * 3 + 2] = v1_index + (r + 1) % num_verts_around;
      i++;
      elementArray[i * 3 + 0] = v0_index + r;
      elementArray[i * 3 + 1] = v1_index + (r + 1) % num_verts_around;
      elementArray[i * 3 + 2] = v0_index + (r + 1) % num_verts_around;
      i++;
    }
  }
  // top cone
  for (let r = 0; r < num_verts_around; r++) {
    const v0_index = 1 + num_verts_around * (num_y_verts - 3);
    const v1_index = 1 + num_verts_around * (num_y_verts - 2);
    elementArray[i * 3 + 0] = v0_index + r;
    elementArray[i * 3 + 1] = v1_index;
    elementArray[i * 3 + 2] = v0_index + (r + 1) % num_verts_around;
    i++;
  }

  if (i !== num_triangles) {
    console.error('bug in sphere mesh indices generation');
  }

  const normalArray = new Float32Array(num_vertices * 3);

  for (i = 0; i < num_triangles; i++) {
    const i0 = elementArray[i * 3 + 0];
    const i1 = elementArray[i * 3 + 1];
    const i2 = elementArray[i * 3 + 2];
    const p0 = vec3.fromValues(...[0, 1, 2].map(j => vertexArray[i0 * 3 + j]));
    const p1 = vec3.fromValues(...[0, 1, 2].map(j => vertexArray[i1 * 3 + j]));
    const p2 = vec3.fromValues(...[0, 1, 2].map(j => vertexArray[i2 * 3 + j]));
    const u = vec3.create(); vec3.sub(u, p2, p0);
    const v = vec3.create(); vec3.sub(v, p1, p0);
    const n = vec3.create(); vec3.cross(n, u, v);
    normalArray[i0 * 3 + 0] += n[0];
    normalArray[i0 * 3 + 1] += n[1];
    normalArray[i0 * 3 + 2] += n[2];
    normalArray[i1 * 3 + 0] += n[0];
    normalArray[i1 * 3 + 1] += n[1];
    normalArray[i1 * 3 + 2] += n[2];
    normalArray[i2 * 3 + 0] += n[0];
    normalArray[i2 * 3 + 1] += n[1];
    normalArray[i2 * 3 + 2] += n[2];
  }
  for (i = 0; i < num_vertices; i++) {
    const v = vec3.fromValues(...[0, 1, 2].map(j => normalArray[i * 3 + j]));
    vec3.normalize(v, v);
    normalArray[i * 3 + 0] = v[0];
    normalArray[i * 3 + 1] = v[1];
    normalArray[i * 3 + 2] = v[2];
  }

  return {
    vertexArray,
    normalArray,
    elementArray,
  };
}
