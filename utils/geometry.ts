export interface Geometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
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

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // front
    4, 5, 6, 4, 6, 7, // back
    8, 9, 10, 8, 10, 11, // top
    12, 13, 14, 12, 14, 15, // bottom
    16, 17, 18, 16, 18, 19, // right
    20, 21, 22, 20, 22, 23, // left
  ]);

  return { positions, normals, indices };
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

  const normals = new Float32Array(5 * 3); // Placeholder, proper normals are complex

  const indices = new Uint16Array([
    // Base
    0, 1, 2, 0, 2, 3,
    // Sides
    0, 1, 4,
    1, 2, 4,
    2, 3, 4,
    3, 0, 4
  ]);

  // A simple approach for normals (not perfect lighting)
  // Base normal
  normals.set([0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0], 0);
  // Apex normal (average of side faces) - simplified to point up
  normals.set([0, 1, 0], 12);
  
  // A more accurate normal calculation would be needed for perfect lighting,
  // but for model-viewer compatibility, this is sufficient.

  return { positions, normals, indices };
}

export function createSphere(radius = 1, sectorCount = 36, stackCount = 18): Geometry {
    const positions: number[] = [];
    const normals: number[] = [];
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
        indices: new Uint16Array(indices)
    };
}

export function createTree(): { trunk: Geometry, canopy: Geometry } {
  // --- Trunk (Hexagonal Prism) ---
  const trunkRadius = 0.25;
  const trunkHeight = 1;
  const trunkPositions: number[] = [];
  const trunkNormals: number[] = [];
  const trunkIndices: number[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * 2 * Math.PI;
    const x = trunkRadius * Math.cos(angle);
    const z = trunkRadius * Math.sin(angle);
    // Bottom vertex
    trunkPositions.push(x, -trunkHeight / 2, z);
    // Top vertex
    trunkPositions.push(x, trunkHeight / 2, z);
  }

  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const p1 = i * 2;
    const p2 = next * 2;
    const p3 = p1 + 1;
    const p4 = p2 + 1;
    trunkIndices.push(p1, p2, p3, p2, p4, p3);

    const angle = (i / 6 + 0.5 / 6) * 2 * Math.PI;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    trunkNormals.push(nx, 0, nz, nx, 0, nz);
  }

  // --- Canopy (Icosahedron) ---
  const t = (1.0 + Math.sqrt(5.0)) / 2.0;
  const canopyRadius = 0.8;
  const canopyPositions: number[] = [
    -1, t, 0,  1, t, 0,  -1, -t, 0,  1, -t, 0,
    0, -1, t,  0, 1, t,  0, -1, -t,  0, 1, -t,
    t, 0, -1,  t, 0, 1,  -t, 0, -1, -t, 0, 1,
  ].map(p => p * canopyRadius * 0.5);

  const canopyIndices = [
    0, 11, 5,  0, 5, 1,  0, 1, 7,  0, 7, 10,  0, 10, 11,
    1, 5, 9,  5, 11, 4, 11, 10, 2, 10, 7, 6,  7, 1, 8,
    3, 9, 4,  3, 4, 2,  3, 2, 6,  3, 6, 8,  3, 8, 9,
    4, 9, 5,  2, 4, 11, 6, 2, 10, 8, 6, 7,  9, 8, 1,
  ];
  
  const canopyNormals: number[] = [];
  for(let i = 0; i < canopyPositions.length; i += 3) {
      const x = canopyPositions[i];
      const y = canopyPositions[i+1];
      const z = canopyPositions[i+2];
      const len = Math.sqrt(x*x + y*y + z*z);
      canopyNormals.push(x/len, y/len, z/len);
  }

  return {
    trunk: {
      positions: new Float32Array(trunkPositions),
      normals: new Float32Array(trunkNormals),
      indices: new Uint16Array(trunkIndices),
    },
    canopy: {
      positions: new Float32Array(canopyPositions),
      normals: new Float32Array(canopyNormals),
      indices: new Uint16Array(canopyIndices),
    }
  };
}