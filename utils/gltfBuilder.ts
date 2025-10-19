import type { Geometry } from './geometry';

interface Shape {
  geometry: Geometry;
  translation: [number, number, number];
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function buildGltf(shapes: Shape[]): string {
  let positionOffset = 0;
  let normalOffset = 0;
  let indexOffset = 0;
  // let vertexCount = 0; // BUG: This was causing incorrect index offsetting.

  const accessors: any[] = [];
  const bufferViews: any[] = [];
  const meshes: any[] = [];
  const nodes: any[] = [];

  const allPositions = new Float32Array(shapes.reduce((acc, s) => acc + s.geometry.positions.length, 0));
  const allNormals = new Float32Array(shapes.reduce((acc, s) => acc + s.geometry.normals.length, 0));
  const allIndices = new Uint16Array(shapes.reduce((acc, s) => acc + s.geometry.indices.length, 0));

  shapes.forEach((shape, shapeIndex) => {
    // 1. Collect geometry data and calculate min/max for positions
    const { positions, normals, indices } = shape.geometry;
    const currentPositions = positions;
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < currentPositions.length; i += 3) {
      const x = currentPositions[i];
      const y = currentPositions[i+1];
      const z = currentPositions[i+2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    allPositions.set(positions, positionOffset / Float32Array.BYTES_PER_ELEMENT);
    allNormals.set(normals, normalOffset / Float32Array.BYTES_PER_ELEMENT);
    
    // FIX: Removed incorrect index offsetting. Each primitive's indices are local.
    // const correctedIndices = indices.map(i => i + vertexCount);
    allIndices.set(indices, indexOffset / Uint16Array.BYTES_PER_ELEMENT);

    // 2. Create bufferViews
    const positionBufferView = {
      buffer: 0,
      byteOffset: positionOffset,
      byteLength: positions.byteLength,
      target: 34962, // ARRAY_BUFFER
    };
    const normalBufferView = {
      buffer: 0,
      byteOffset: 0, // Will be set after all positions are accounted for
      byteLength: normals.byteLength,
      target: 34962, // ARRAY_BUFFER
    };
    const indexBufferView = {
      buffer: 0,
      byteOffset: 0, // Will be set after positions and normals
      byteLength: indices.byteLength,
      target: 34963, // ELEMENT_ARRAY_BUFFER
    };

    bufferViews.push(positionBufferView, normalBufferView, indexBufferView);
    const posViewIdx = bufferViews.length - 3;
    const normViewIdx = bufferViews.length - 2;
    const indViewIdx = bufferViews.length - 1;

    // 3. Create accessors
    const positionAccessor = {
      bufferView: posViewIdx,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: positions.length / 3,
      type: 'VEC3',
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    };
    const normalAccessor = {
      bufferView: normViewIdx,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: normals.length / 3,
      type: 'VEC3',
    };
    const indexAccessor = {
      bufferView: indViewIdx,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: indices.length,
      type: 'SCALAR',
    };
    
    accessors.push(positionAccessor, normalAccessor, indexAccessor);
    const posAccIdx = accessors.length - 3;
    const normAccIdx = accessors.length - 2;
    const indAccIdx = accessors.length - 1;

    // 4. Create meshes
    const mesh = {
      primitives: [{
        attributes: {
          POSITION: posAccIdx,
          NORMAL: normAccIdx,
        },
        indices: indAccIdx,
        mode: 4, // TRIANGLES
      }],
    };
    meshes.push(mesh);
    
    // 5. Create nodes
    const node = {
      mesh: shapeIndex,
      translation: shape.translation,
    };
    nodes.push(node);

    // 6. Update offsets and vertex count for the next shape
    positionOffset += positions.byteLength;
    normalOffset += normals.byteLength;
    indexOffset += indices.byteLength;
    // vertexCount += positions.length / 3; // BUG: This was causing incorrect index offsetting.
  });

  // Calculate final buffer offsets
  const posTotalLength = positionOffset;
  const normTotalLength = normalOffset;
  
  let currentOffset = posTotalLength;
  bufferViews.forEach(bv => {
      if (bv.target === 34962 && bv.byteOffset === 0) { // Normals
          bv.byteOffset = currentOffset;
          currentOffset += bv.byteLength;
      }
  });
  
  currentOffset = posTotalLength + normTotalLength;
   bufferViews.forEach(bv => {
      if (bv.target === 34963) { // Indices
          bv.byteOffset = currentOffset;
          currentOffset += bv.byteLength;
      }
  });


  // Combine all data into a single buffer
  const totalByteLength = posTotalLength + normTotalLength + indexOffset;
  const combinedBuffer = new ArrayBuffer(totalByteLength);
  const dataView = new DataView(combinedBuffer);

  let bytePtr = 0;
  new Uint8Array(combinedBuffer, bytePtr, allPositions.byteLength).set(new Uint8Array(allPositions.buffer));
  bytePtr += allPositions.byteLength;
  new Uint8Array(combinedBuffer, bytePtr, allNormals.byteLength).set(new Uint8Array(allNormals.buffer));
  bytePtr += allNormals.byteLength;
  new Uint8Array(combinedBuffer, bytePtr, allIndices.byteLength).set(new Uint8Array(allIndices.buffer));

  const base64String = arrayBufferToBase64(combinedBuffer);
  
  const gltf = {
    asset: {
      version: "2.0",
      generator: "React GLTF Scene Generator"
    },
    scenes: [{
      nodes: nodes.map((_, i) => i),
    }],
    scene: 0,
    nodes,
    meshes,
    accessors,
    bufferViews,
    buffers: [{
      byteLength: totalByteLength,
      uri: `data:application/octet-stream;base64,${base64String}`,
    }],
  };

  return JSON.stringify(gltf, null, 2);
}