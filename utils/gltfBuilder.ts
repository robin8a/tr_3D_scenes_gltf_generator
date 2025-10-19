import type { Geometry } from './geometry';

// FIX: Export the Shape interface to make it available for import in other modules.
export interface Shape {
  geometry: Geometry;
  translation: [number, number, number];
  color?: [number, number, number, number]; // RGBA color
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

  const accessors: any[] = [];
  const bufferViews: any[] = [];
  const meshes: any[] = [];
  const nodes: any[] = [];
  const materials: any[] = [];
  const materialMap = new Map<string, number>();

  // Ensure a default material exists
  const defaultColor = [0.8, 0.8, 0.8, 1.0];
  const defaultMaterialKey = JSON.stringify(defaultColor);
  materialMap.set(defaultMaterialKey, 0);
  materials.push({
    pbrMetallicRoughness: {
      baseColorFactor: defaultColor,
      metallicFactor: 0.2,
      roughnessFactor: 0.8,
    },
  });

  const allPositions = new Float32Array(shapes.reduce((acc, s) => acc + s.geometry.positions.length, 0));
  const allNormals = new Float32Array(shapes.reduce((acc, s) => acc + s.geometry.normals.length, 0));
  const allIndices = new Uint16Array(shapes.reduce((acc, s) => acc + s.geometry.indices.length, 0));

  shapes.forEach((shape, shapeIndex) => {
    // 1. Collect geometry data and calculate min/max for positions
    const { positions, normals, indices } = shape.geometry;
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i+1], z = positions[i+2];
      if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
    }

    allPositions.set(positions, positionOffset / Float32Array.BYTES_PER_ELEMENT);
    allNormals.set(normals, normalOffset / Float32Array.BYTES_PER_ELEMENT);
    allIndices.set(indices, indexOffset / Uint16Array.BYTES_PER_ELEMENT);

    // 2. Manage Materials
    const colorKey = JSON.stringify(shape.color || defaultColor);
    let materialIndex: number;
    if (materialMap.has(colorKey)) {
        materialIndex = materialMap.get(colorKey)!;
    } else {
        materialIndex = materials.length;
        materials.push({
            pbrMetallicRoughness: {
                baseColorFactor: shape.color,
                metallicFactor: 0.1,
                roughnessFactor: 0.9,
            },
        });
        materialMap.set(colorKey, materialIndex);
    }

    // 3. Create bufferViews
    const positionBufferView = { buffer: 0, byteOffset: positionOffset, byteLength: positions.byteLength, target: 34962 };
    const normalBufferView = { buffer: 0, byteOffset: 0, byteLength: normals.byteLength, target: 34962 };
    const indexBufferView = { buffer: 0, byteOffset: 0, byteLength: indices.byteLength, target: 34963 };
    
    bufferViews.push(positionBufferView, normalBufferView, indexBufferView);
    const posViewIdx = bufferViews.length - 3;
    const normViewIdx = bufferViews.length - 2;
    const indViewIdx = bufferViews.length - 1;

    // 4. Create accessors
    const positionAccessor = { bufferView: posViewIdx, byteOffset: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
    const normalAccessor = { bufferView: normViewIdx, byteOffset: 0, componentType: 5126, count: normals.length / 3, type: 'VEC3' };
    const indexAccessor = { bufferView: indViewIdx, byteOffset: 0, componentType: 5123, count: indices.length, type: 'SCALAR' };
    
    accessors.push(positionAccessor, normalAccessor, indexAccessor);
    const posAccIdx = accessors.length - 3;
    const normAccIdx = accessors.length - 2;
    const indAccIdx = accessors.length - 1;

    // 5. Create meshes
    const mesh = {
      primitives: [{
        attributes: { POSITION: posAccIdx, NORMAL: normAccIdx },
        indices: indAccIdx,
        mode: 4, // TRIANGLES
        material: materialIndex,
      }],
    };
    meshes.push(mesh);
    
    // 6. Create nodes
    const node = { mesh: shapeIndex, translation: shape.translation };
    nodes.push(node);

    // 7. Update offsets
    positionOffset += positions.byteLength;
    normalOffset += normals.byteLength;
    indexOffset += indices.byteLength;
  });

  // Calculate final buffer offsets
  const posTotalLength = positionOffset;
  const normTotalLength = normalOffset;
  
  let currentNormOffset = posTotalLength;
  bufferViews.forEach(bv => {
      if (bv.target === 34962 && bv.byteOffset === 0) { // Normals
          bv.byteOffset = currentNormOffset;
          currentNormOffset += bv.byteLength;
      }
  });
  
  let currentIndexOffset = posTotalLength + normTotalLength;
   bufferViews.forEach(bv => {
      if (bv.target === 34963) { // Indices
          bv.byteOffset = currentIndexOffset;
          currentIndexOffset += bv.byteLength;
      }
  });

  // Combine all data into a single buffer
  const totalByteLength = posTotalLength + normTotalLength + indexOffset;
  const combinedBuffer = new ArrayBuffer(totalByteLength);
  
  new Uint8Array(combinedBuffer, 0, allPositions.byteLength).set(new Uint8Array(allPositions.buffer));
  new Uint8Array(combinedBuffer, posTotalLength, allNormals.byteLength).set(new Uint8Array(allNormals.buffer));
  new Uint8Array(combinedBuffer, posTotalLength + normTotalLength, allIndices.byteLength).set(new Uint8Array(allIndices.buffer));

  const base64String = arrayBufferToBase64(combinedBuffer);
  
  const gltf = {
    asset: { version: "2.0", generator: "React GLTF Scene Generator" },
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    scene: 0,
    nodes,
    meshes,
    accessors,
    bufferViews,
    materials,
    buffers: [{
      byteLength: totalByteLength,
      uri: `data:application/octet-stream;base64,${base64String}`,
    }],
  };

  return JSON.stringify(gltf, null, 2);
}
