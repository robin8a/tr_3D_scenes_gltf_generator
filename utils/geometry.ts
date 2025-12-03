
export interface Geometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  colors?: Float32Array;
  uvs?: Float32Array;
  texture?: string; // Data URI of the texture image
}

export function createCube(size = 1): Geometry {
  const s = size / 2;
  const positions = new Float32Array([
    // Front face
    -s, -s, s, s, -s, s, s, s, s, -s, s, s,
    // Back face
    -s, -s, -s, -s, s, -s, s, s, -s, s, -s, -s,
    // Top face
    -s, s, -s, -s, s, s, s, s, s, s, s, -s,
    // Bottom face
    -s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s,
    // Right face
    s, -s, -s, s, s, -s, s, s, s, s, -s, s,
    // Left face
    -s, -s, -s, -s, -s, s, -s, s, s, -s, s, -s,
  ]);

  const normals = new Float32Array([
    // Front
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    // Back
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    // Top
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    // Bottom
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    // Right
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    // Left
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  const uvs = new Float32Array([
      // Front
      0, 0, 1, 0, 1, 1, 0, 1,
      // Back
      1, 0, 0, 0, 0, 1, 1, 1,
      // Top
      0, 1, 0, 0, 1, 0, 1, 1,
      // Bottom
      0, 0, 1, 0, 1, 1, 0, 1,
      // Right
      0, 0, 1, 0, 1, 1, 0, 1,
      // Left
      0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // front
    4, 5, 6, 4, 6, 7, // back
    8, 9, 10, 8, 10, 11, // top
    12, 13, 14, 12, 14, 15, // bottom
    16, 17, 18, 16, 18, 19, // right
    20, 21, 22, 20, 22, 23, // left
  ]);

  return { positions, normals, indices, uvs };
}

export function createPyramid(baseSize = 1, height = 1): Geometry {
  const s = baseSize / 2;
  const h = height / 2;

  const positions = new Float32Array([
    // Base
    -s, -h, s, s, -h, s, s, -h, -s, -s, -h, -s,
    // Apex
    0, h, 0,
  ]);

  const normals = new Float32Array(5 * 3); 

  const indices = new Uint16Array([
    // Base
    0, 1, 2, 0, 2, 3,
    // Sides
    0, 1, 4,
    1, 2, 4,
    2, 3, 4,
    3, 0, 4
  ]);

  // Base normal
  normals.set([0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0], 0);
  // Apex normal
  normals.set([0, 1, 0], 12);
  
  // Basic UVs for base
  const uvs = new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1, // Base
      0.5, 0.5 // Apex
  ]);

  return { positions, normals, indices, uvs };
}

export function createSphere(radius = 1, sectorCount = 36, stackCount = 18): Geometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= stackCount; ++i) {
        const stackAngle = Math.PI / stackCount * i;
        const sinStack = Math.sin(stackAngle);
        const cosStack = Math.cos(stackAngle);

        for (let j = 0; j <= sectorCount; ++j) {
            const sectorAngle = 2 * Math.PI / sectorCount * j;
            const sinSector = Math.sin(sectorAngle);
            const cosSector = Math.cos(sectorAngle);
            
            const x = radius * sinStack * cosSector;
            const y = radius * cosStack;
            const z = radius * sinStack * sinSector;
            
            positions.push(x, y, z);
            
            const nx = x / radius;
            const ny = y / radius;
            const nz = z / radius;
            normals.push(nx, ny, nz);

            const u = 1 - (j / sectorCount);
            const v = 1 - (i / stackCount);
            uvs.push(u, v);
        }
    }

    for (let i = 0; i < stackCount; ++i) {
        for (let j = 0; j < sectorCount; ++j) {
            const first = (i * (sectorCount + 1)) + j;
            const second = first + sectorCount + 1;
            
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        uvs: new Float32Array(uvs)
    };
}
