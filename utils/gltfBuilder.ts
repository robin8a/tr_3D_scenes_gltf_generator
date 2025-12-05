
import type { Geometry } from './geometry';

export interface Shape {
  geometry: Geometry;
  translation: [number, number, number];
  rotation?: [number, number, number, number]; // Quaternion [x, y, z, w]
  scale?: [number, number, number]; // [x, y, z]
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

// Internal function to generate the JSON structure and binary buffer
function generateGltfParts(shapes: Shape[]): { gltf: any; combinedBuffer: ArrayBuffer } {
  const accessors: any[] = [];
  const bufferViews: any[] = [];
  const meshes: any[] = [];
  const nodes: any[] = [];
  const materials: any[] = [];
  const textures: any[] = [];
  const images: any[] = [];
  const samplers: any[] = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }]; // Default sampler
  
  const materialMap = new Map<string, number>();
  const textureMap = new Map<string, number>();

  // --- 1. Aggregate all geometry data into single arrays ---
  const totalPosElements = shapes.reduce((acc, s) => acc + s.geometry.positions.length, 0);
  const totalNormElements = shapes.reduce((acc, s) => acc + s.geometry.normals.length, 0);
  const totalColorElements = shapes.reduce((acc, s) => acc + (s.geometry.colors ? s.geometry.colors.length : 0), 0);
  const totalUVElements = shapes.reduce((acc, s) => acc + (s.geometry.uvs ? s.geometry.uvs.length : 0), 0);
  const totalIndexElements = shapes.reduce((acc, s) => acc + s.geometry.indices.length, 0);

  const allPositions = new Float32Array(totalPosElements);
  const allNormals = new Float32Array(totalNormElements);
  const allColors = new Float32Array(totalColorElements);
  const allUVs = new Float32Array(totalUVElements);
  const allIndices = new Uint16Array(totalIndexElements);

  let pOffset = 0, nOffset = 0, cOffset = 0, uvOffset = 0, iOffset = 0;
  for (const shape of shapes) {
    allPositions.set(shape.geometry.positions, pOffset);
    allNormals.set(shape.geometry.normals, nOffset);
    if (shape.geometry.colors) {
      allColors.set(shape.geometry.colors, cOffset);
    }
    if (shape.geometry.uvs) {
      allUVs.set(shape.geometry.uvs, uvOffset);
    }
    allIndices.set(shape.geometry.indices, iOffset);

    pOffset += shape.geometry.positions.length;
    nOffset += shape.geometry.normals.length;
    cOffset += shape.geometry.colors ? shape.geometry.colors.length : 0;
    uvOffset += shape.geometry.uvs ? shape.geometry.uvs.length : 0;
    iOffset += shape.geometry.indices.length;
  }
  
  // --- 2. Create the combined buffer and buffer views ---
  const posBufferByteLength = allPositions.byteLength;
  const normBufferByteLength = allNormals.byteLength;
  const colorBufferByteLength = allColors.byteLength;
  const uvBufferByteLength = allUVs.byteLength;
  const indexBufferByteLength = allIndices.byteLength;

  const totalByteLength = posBufferByteLength + normBufferByteLength + colorBufferByteLength + uvBufferByteLength + indexBufferByteLength;
  const combinedBuffer = new ArrayBuffer(totalByteLength);
  const combinedBufferView = new Uint8Array(combinedBuffer);

  let byteOffset = 0;
  
  // Positions (view 0)
  combinedBufferView.set(new Uint8Array(allPositions.buffer), byteOffset);
  bufferViews.push({ buffer: 0, byteOffset, byteLength: posBufferByteLength, target: 34962 });
  byteOffset += posBufferByteLength;
  
  // Normals (view 1)
  combinedBufferView.set(new Uint8Array(allNormals.buffer), byteOffset);
  bufferViews.push({ buffer: 0, byteOffset, byteLength: normBufferByteLength, target: 34962 });
  byteOffset += normBufferByteLength;

  // Colors (view 2 - optional)
  if (colorBufferByteLength > 0) {
    combinedBufferView.set(new Uint8Array(allColors.buffer), byteOffset);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: colorBufferByteLength, target: 34962 });
    byteOffset += colorBufferByteLength;
  }

  // UVs (view 3 - optional)
  let uvBufferViewIdx = -1;
  if (uvBufferByteLength > 0) {
    uvBufferViewIdx = bufferViews.length;
    combinedBufferView.set(new Uint8Array(allUVs.buffer), byteOffset);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: uvBufferByteLength, target: 34962 });
    byteOffset += uvBufferByteLength;
  }
  
  // Indices (view 4 - last)
  const indexBufferViewIdx = bufferViews.length;
  combinedBufferView.set(new Uint8Array(allIndices.buffer), byteOffset);
  bufferViews.push({ buffer: 0, byteOffset, byteLength: indexBufferByteLength, target: 34963 });

  // --- 3. Create materials, accessors, and meshes for each shape ---
  let pElementOffset = 0, nElementOffset = 0, cElementOffset = 0, uvElementOffset = 0, iElementOffset = 0;
  
  shapes.forEach((shape, shapeIndex) => {
    const { positions, normals, indices, colors, uvs, primitives } = shape.geometry;

    const numVertices = positions.length / 3;
    const isV4Colors = colors && (colors.length / numVertices === 4);

    // Accessors
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i+1], z = positions[i+2];
      minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
    }
    
    // Position Accessor
    const posAccessorIdx = accessors.length;
    accessors.push({ bufferView: 0, byteOffset: pElementOffset * Float32Array.BYTES_PER_ELEMENT, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ] });
    
    // Normal Accessor
    const normAccessorIdx = accessors.length;
    accessors.push({ bufferView: 1, byteOffset: nElementOffset * Float32Array.BYTES_PER_ELEMENT, componentType: 5126, count: normals.length / 3, type: 'VEC3' });
    
    // Color Accessor
    let colorAccessorIdx = -1;
    if (colors && colors.length > 0) {
      colorAccessorIdx = accessors.length;
      accessors.push({ 
          bufferView: 2, 
          byteOffset: cElementOffset * Float32Array.BYTES_PER_ELEMENT, 
          componentType: 5126, 
          count: colors.length / (isV4Colors ? 4 : 3), 
          type: isV4Colors ? 'VEC4' : 'VEC3' 
      });
    }

    // UV Accessor
    let uvAccessorIdx = -1;
    if (uvs && uvs.length > 0 && uvBufferViewIdx !== -1) {
        uvAccessorIdx = accessors.length;
        accessors.push({ bufferView: uvBufferViewIdx, byteOffset: uvElementOffset * Float32Array.BYTES_PER_ELEMENT, componentType: 5126, count: uvs.length / 2, type: 'VEC2' });
    }
    
    // Helper to get/create material
    const getMaterialIndex = (tex?: string, color?: [number, number, number, number]): number => {
        if (tex) {
            if (!textureMap.has(tex)) {
                const imageIdx = images.length;
                images.push({ uri: tex, mimeType: "image/png" });
                const texIdx = textures.length;
                textures.push({ sampler: 0, source: imageIdx });
                textureMap.set(tex, texIdx);
            }
            const textureIndex = textureMap.get(tex)!;
            const matKey = `TEX_${textureIndex}`;
            if (!materialMap.has(matKey)) {
                const mIdx = materials.length;
                materials.push({
                    pbrMetallicRoughness: {
                        baseColorTexture: { index: textureIndex },
                        baseColorFactor: color || [1.0, 1.0, 1.0, 1.0],
                        metallicFactor: 0.0,
                        roughnessFactor: 1.0
                    },
                    name: `Material_Texture_${textureIndex}`,
                    doubleSided: true,
                    alphaMode: 'MASK', // Crucial for trees/leaves!
                    alphaCutoff: 0.5
                });
                materialMap.set(matKey, mIdx);
                return mIdx;
            }
            return materialMap.get(matKey)!;
        } else if (colors && colors.length > 0) {
            // Use vertex colors
            const matKey = "##VERTEX_COLORS##";
            if (!materialMap.has(matKey)) {
                const mIdx = materials.length;
                materials.push({
                    pbrMetallicRoughness: { baseColorFactor: [1.0, 1.0, 1.0, 1.0] },
                    name: "VertexColorMaterial",
                    doubleSided: true,
                    alphaMode: isV4Colors ? 'BLEND' : 'OPAQUE'
                });
                materialMap.set(matKey, mIdx);
                return mIdx;
            }
            return materialMap.get(matKey)!;
        } else {
            // Flat Color
            const defaultColor = [0.8, 0.8, 0.8, 1.0];
            const c = color || shape.color || defaultColor;
            const matKey = JSON.stringify(c);
            if (!materialMap.has(matKey)) {
                const mIdx = materials.length;
                materials.push({
                    pbrMetallicRoughness: { baseColorFactor: c },
                    name: `Material_${matKey}`,
                    doubleSided: true
                });
                materialMap.set(matKey, mIdx);
                return mIdx;
            }
            return materialMap.get(matKey)!;
        }
    };

    const meshPrimitives: any[] = [];
    
    if (primitives && primitives.length > 0) {
        // Multi-primitive mesh
        for (const prim of primitives) {
            const matIndex = getMaterialIndex(prim.texture, prim.color);
            
            // Create a specific index accessor for this primitive
            const primIndicesAccessorIdx = accessors.length;
            
            // The byte offset is the global offset (iElementOffset) plus the primitive's offset
            const byteOffset = (iElementOffset + prim.indicesOffset) * Uint16Array.BYTES_PER_ELEMENT;
            
            accessors.push({
                bufferView: indexBufferViewIdx,
                byteOffset: byteOffset,
                componentType: 5123,
                count: prim.indicesCount,
                type: 'SCALAR'
            });

            const attributes: { [key: string]: number } = { POSITION: posAccessorIdx, NORMAL: normAccessorIdx };
            if (colorAccessorIdx !== -1) attributes.COLOR_0 = colorAccessorIdx;
            if (uvAccessorIdx !== -1) attributes.TEXCOORD_0 = uvAccessorIdx;

            meshPrimitives.push({
                attributes,
                indices: primIndicesAccessorIdx,
                mode: 4,
                material: matIndex
            });
        }
    } else {
        // Single primitive mesh (legacy/simple)
        const matIndex = getMaterialIndex(shape.geometry.texture, undefined);
        
        // Use the full index range for this shape
        const indexAccessorIdx = accessors.length;
        accessors.push({ 
            bufferView: indexBufferViewIdx, 
            byteOffset: iElementOffset * Uint16Array.BYTES_PER_ELEMENT, 
            componentType: 5123, 
            count: indices.length, 
            type: 'SCALAR' 
        });

        const attributes: { [key: string]: number } = { POSITION: posAccessorIdx, NORMAL: normAccessorIdx };
        if (colorAccessorIdx !== -1) attributes.COLOR_0 = colorAccessorIdx;
        if (uvAccessorIdx !== -1) attributes.TEXCOORD_0 = uvAccessorIdx;

        meshPrimitives.push({
            attributes,
            indices: indexAccessorIdx,
            mode: 4,
            material: matIndex
        });
    }

    meshes.push({ primitives: meshPrimitives });
    
    const node: any = { mesh: shapeIndex, translation: shape.translation };
    if (shape.rotation) node.rotation = shape.rotation;
    if (shape.scale) node.scale = shape.scale;
    nodes.push(node);
    
    // Update global element offsets
    pElementOffset += positions.length;
    nElementOffset += normals.length;
    cElementOffset += colors ? colors.length : 0;
    uvElementOffset += uvs ? uvs.length : 0;
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
    textures,
    images,
    samplers,
    buffers: [{
      byteLength: totalByteLength,
    }],
  };
  return { gltf, combinedBuffer };
}

export function buildGltf(shapes: Shape[]): string {
  const { gltf, combinedBuffer } = generateGltfParts(shapes);
  gltf.buffers[0].uri = `data:application/octet-stream;base64,${arrayBufferToBase64(combinedBuffer)}`;
  return JSON.stringify(gltf, null, 2);
}

function padBuffer(buffer: Uint8Array, alignment: number, padWith: number): Uint8Array {
    const remainder = buffer.byteLength % alignment;
    if (remainder === 0) {
      return buffer;
    }
    const padding = alignment - remainder;
    const paddedBuffer = new Uint8Array(buffer.byteLength + padding);
    paddedBuffer.set(buffer, 0);
    paddedBuffer.fill(padWith, buffer.byteLength);
    return paddedBuffer;
}

export function buildGlb(shapes: Shape[]): ArrayBuffer {
  const { gltf, combinedBuffer } = generateGltfParts(shapes);

  // 1. JSON chunk
  const jsonString = JSON.stringify(gltf);
  const jsonEncoder = new TextEncoder();
  const jsonBytes = jsonEncoder.encode(jsonString);
  const paddedJsonBytes = padBuffer(jsonBytes, 4, 0x20); // Pad with spaces

  // 2. Binary chunk (BIN)
  const binaryBytes = new Uint8Array(combinedBuffer);
  const paddedBinaryBytes = padBuffer(binaryBytes, 4, 0x00); // Pad with nulls

  const jsonChunkLength = paddedJsonBytes.byteLength;
  const binaryChunkLength = paddedBinaryBytes.byteLength;
  
  // 3. GLB Header
  const headerLength = 12;
  const jsonChunkHeaderLength = 8;
  const binaryChunkHeaderLength = 8;
  const totalLength = headerLength + jsonChunkHeaderLength + jsonChunkLength + (binaryChunkLength > 0 ? binaryChunkHeaderLength + binaryChunkLength : 0);

  const glbBuffer = new ArrayBuffer(totalLength);
  const glbView = new DataView(glbBuffer);
  let offset = 0;

  // Header
  const magic = 0x46546C67; // "glTF"
  const version = 2;
  glbView.setUint32(offset, magic, true);
  offset += 4;
  glbView.setUint32(offset, version, true);
  offset += 4;
  glbView.setUint32(offset, totalLength, true);
  offset += 4;
  
  // JSON Chunk
  glbView.setUint32(offset, jsonChunkLength, true);
  offset += 4;
  glbView.setUint32(offset, 0x4E4F534A, true); // "JSON"
  offset += 4;
  new Uint8Array(glbBuffer).set(paddedJsonBytes, offset);
  offset += jsonChunkLength;

  // BIN Chunk (optional)
  if (binaryChunkLength > 0) {
    glbView.setUint32(offset, binaryChunkLength, true);
    offset += 4;
    glbView.setUint32(offset, 0x004E4942, true); // "BIN" followed by null
    offset += 4;
    new Uint8Array(glbBuffer).set(paddedBinaryBytes, offset);
  }
  
  return glbBuffer;
}
