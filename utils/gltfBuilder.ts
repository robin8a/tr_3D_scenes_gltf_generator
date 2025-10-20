
import type { Geometry } from './geometry';

export interface Shape {
  geometry: Geometry;
  translation: [number, number, number];
  color?: [number, number, number, number]; // RGBA color, used if no vertex colors
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function buildGltf(shapes: Shape[]): string {
  const accessors: any[] = [];
  const bufferViews: any[] = [];
  const meshes: any[] = [];
  const nodes: any[] = [];
  const materials: any[] = [];
  const materialMap = new Map<string, number>();

  // --- 1. Aggregate all geometry data into single arrays ---
  const totalPosElements = shapes.reduce((acc, s) => acc + s.geometry.positions.length, 0);
  const totalNormElements = shapes.reduce((acc, s) => acc + s.geometry.normals.length, 0);
  const totalColorElements = shapes.reduce((acc, s) => acc + (s.geometry.colors ? s.geometry.colors.length : 0), 0);
  const totalIndexElements = shapes.reduce((acc, s) => acc + s.geometry.indices.length, 0);

  const allPositions = new Float32Array(totalPosElements);
  const allNormals = new Float32Array(totalNormElements);
  const allColors = new Float32Array(totalColorElements);
  const allIndices = new Uint16Array(totalIndexElements);

  let pOffset = 0, nOffset = 0, cOffset = 0, iOffset = 0;
  for (const shape of shapes) {
    allPositions.set(shape.geometry.positions, pOffset);
    allNormals.set(shape.geometry.normals, nOffset);
    if (shape.geometry.colors) {
      allColors.set(shape.geometry.colors, cOffset);
    }
    allIndices.set(shape.geometry.indices, iOffset);

    pOffset += shape.geometry.positions.length;
    nOffset += shape.geometry.normals.length;
    cOffset += shape.geometry.colors ? shape.geometry.colors.length : 0;
    iOffset += shape.geometry.indices.length;
  }
  
  // --- 2. Create the combined buffer and buffer views ---
  const posBufferByteLength = allPositions.byteLength;
  const normBufferByteLength = allNormals.byteLength;
  const colorBufferByteLength = allColors.byteLength;
  const indexBufferByteLength = allIndices.byteLength;

  const totalByteLength = posBufferByteLength + normBufferByteLength + colorBufferByteLength + indexBufferByteLength;
  const combinedBuffer = new ArrayBuffer(totalByteLength);
  const combinedBufferView = new Uint8Array(combinedBuffer);

  let byteOffset = 0;
  combinedBufferView.set(new Uint8Array(allPositions.buffer), byteOffset);
  bufferViews.push({ buffer: 0, byteOffset, byteLength: posBufferByteLength, target: 34962 });
  byteOffset += posBufferByteLength;
  
  combinedBufferView.set(new Uint8Array(allNormals.buffer), byteOffset);
  bufferViews.push({ buffer: 0, byteOffset, byteLength: normBufferByteLength, target: 34962 });
  byteOffset += normBufferByteLength;

  if (colorBufferByteLength > 0) {
    combinedBufferView.set(new Uint8Array(allColors.buffer), byteOffset);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: colorBufferByteLength, target: 34962 });
    byteOffset += colorBufferByteLength;
  }
  
  combinedBufferView.set(new Uint8Array(allIndices.buffer), byteOffset);
  bufferViews.push({ buffer: 0, byteOffset, byteLength: indexBufferByteLength, target: 34963 });

  // --- 3. Create materials, accessors, and meshes for each shape ---
  let pElementOffset = 0, nElementOffset = 0, cElementOffset = 0, iElementOffset = 0;
  shapes.forEach((shape, shapeIndex) => {
    const { positions, normals, indices, colors } = shape.geometry;

    // Manage Materials
    let materialIndex: number;
    if (colors && colors.length > 0) {
        const vertexColorKey = "##VERTEX_COLORS##";
        if (!materialMap.has(vertexColorKey)) {
            materialIndex = materials.length;
            materials.push({
                pbrMetallicRoughness: { baseColorFactor: [1.0, 1.0, 1.0, 1.0] },
                name: "VertexColorMaterial",
                doubleSided: true
            });
            materialMap.set(vertexColorKey, materialIndex);
        } else {
            materialIndex = materialMap.get(vertexColorKey)!;
        }
    } else {
        const defaultColor = [0.8, 0.8, 0.8, 1.0];
        const colorKey = JSON.stringify(shape.color || defaultColor);
        if (!materialMap.has(colorKey)) {
            materialIndex = materials.length;
            materials.push({
                pbrMetallicRoughness: { baseColorFactor: shape.color || defaultColor },
                name: `Material_${colorKey}`
            });
            materialMap.set(colorKey, materialIndex);
        } else {
            materialIndex = materialMap.get(colorKey)!;
        }
    }

    // Accessors
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i+1], z = positions[i+2];
      minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
    }
    
    const posAccessorIdx = accessors.length;
    accessors.push({ bufferView: 0, byteOffset: pElementOffset * Float32Array.BYTES_PER_ELEMENT, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ] });
    
    const normAccessorIdx = accessors.length;
    accessors.push({ bufferView: 1, byteOffset: nElementOffset * Float32Array.BYTES_PER_ELEMENT, componentType: 5126, count: normals.length / 3, type: 'VEC3' });
    
    let colorAccessorIdx = -1;
    if (colors && colors.length > 0) {
      colorAccessorIdx = accessors.length;
      accessors.push({ bufferView: 2, byteOffset: cElementOffset * Float32Array.BYTES_PER_ELEMENT, componentType: 5126, count: colors.length / 3, type: 'VEC3' });
    }
    
    const indexAccessorIdx = accessors.length;
    const indexBvIndex = colorBufferByteLength > 0 ? 3 : 2;
    accessors.push({ bufferView: indexBvIndex, byteOffset: iElementOffset * Uint16Array.BYTES_PER_ELEMENT, componentType: 5123, count: indices.length, type: 'SCALAR' });

    // Mesh Primitive
    const attributes: { [key: string]: number } = { POSITION: posAccessorIdx, NORMAL: normAccessorIdx };
    if (colorAccessorIdx !== -1) {
      attributes.COLOR_0 = colorAccessorIdx;
    }
    
    meshes.push({
      primitives: [{
        attributes,
        indices: indexAccessorIdx,
        mode: 4, // TRIANGLES
        material: materialIndex,
      }],
    });
    
    nodes.push({ mesh: shapeIndex, translation: shape.translation });
    
    // Update element offsets for next shape
    pElementOffset += positions.length;
    nElementOffset += normals.length;
    cElementOffset += colors ? colors.length : 0;
    iElementOffset += indices.length;
  });

  // --- 4. Assemble the final glTF object ---
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
      uri: `data:application/octet-stream;base64,${arrayBufferToBase64(combinedBuffer)}`,
    }],
  };

  return JSON.stringify(gltf, null, 2);
}
