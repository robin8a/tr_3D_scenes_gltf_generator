
import type { Geometry } from './geometry';

const CHUNK_TYPE = {
  JSON: 0x4E4F534A,
  BIN: 0x004E4942,
};

// Maps glTF component types to JS TypedArray constructors
const COMPONENT_TYPE_MAP: { [key: number]: any } = {
  5120: Int8Array,    // BYTE
  5121: Uint8Array,   // UNSIGNED_BYTE
  5122: Int16Array,   // SHORT
  5123: Uint16Array,  // UNSIGNED_SHORT
  5125: Uint32Array,  // UNSIGNED_INT
  5126: Float32Array, // FLOAT
};

// Maps glTF type strings to the number of components they have
const TYPE_COMPONENT_COUNT_MAP: { [key: string]: number } = {
  'SCALAR': 1,
  'VEC2': 2,
  'VEC3': 3,
  'VEC4': 4,
  'MAT2': 4,
  'MAT3': 9,
  'MAT4': 16,
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Parses a GLB file's ArrayBuffer to extract geometry from its first mesh.
 * Merges all primitives in the first mesh to ensure the entire model is displayed.
 * @param arrayBuffer The ArrayBuffer of the .glb file.
 * @returns A Promise that resolves to a Geometry object.
 */
export async function parseGlb(arrayBuffer: ArrayBuffer): Promise<Geometry> {
    const dataView = new DataView(arrayBuffer);

    // 1. Read GLB header
    const magic = dataView.getUint32(0, true);
    if (magic !== 0x46546C67) { // "glTF"
        throw new Error('Invalid GLB file: Incorrect magic number.');
    }
    const version = dataView.getUint32(4, true);
    if (version !== 2) {
        throw new Error('Unsupported GLB version. Only version 2 is supported.');
    }

    let chunkOffset = 12; // Header size is 12 bytes
    
    // 2. Read JSON chunk
    const jsonChunkLength = dataView.getUint32(chunkOffset, true);
    chunkOffset += 4;
    const jsonChunkType = dataView.getUint32(chunkOffset, true);
    chunkOffset += 4;
    if (jsonChunkType !== CHUNK_TYPE.JSON) {
        throw new Error('Invalid GLB: First chunk must be JSON.');
    }
    const jsonBytes = new Uint8Array(arrayBuffer, chunkOffset, jsonChunkLength);
    const jsonString = new TextDecoder('utf-8').decode(jsonBytes);
    const gltf = JSON.parse(jsonString);
    chunkOffset += jsonChunkLength;

    // 3. Read BIN chunk
    let binaryBuffer: ArrayBuffer | undefined;
    
    // Iterate through remaining chunks to find BIN
    while (chunkOffset < dataView.byteLength) {
        const chunkLength = dataView.getUint32(chunkOffset, true);
        chunkOffset += 4;
        const chunkType = dataView.getUint32(chunkOffset, true);
        chunkOffset += 4;

        if (chunkType === CHUNK_TYPE.BIN) {
            binaryBuffer = arrayBuffer.slice(chunkOffset, chunkOffset + chunkLength);
            break; // Found it
        }
        
        chunkOffset += chunkLength;
    }
    
    if (!binaryBuffer) {
        throw new Error('GLB file does not contain a binary buffer chunk.');
    }
    
    // 4. Find the first mesh
    const mesh = gltf.meshes?.[0];
    if (!mesh) {
        throw new Error('GLB file does not contain any meshes.');
    }
    const primitives = mesh.primitives || [];
    if (primitives.length === 0) {
        throw new Error('Mesh has no primitives.');
    }

    // 5. Helper function to get TypedArray data from an accessor
    const getAccessorData = (accessorIndex: number): TypedArray => {
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const TypedArrayConstructor = COMPONENT_TYPE_MAP[accessor.componentType];
        
        if (!TypedArrayConstructor) {
            throw new Error(`Unsupported component type: ${accessor.componentType}`);
        }

        const componentCount = TYPE_COMPONENT_COUNT_MAP[accessor.type] || 1;
        const elementCount = accessor.count;
        const totalComponents = elementCount * componentCount;
        
        // Offset relative to the buffer (which we extracted as binaryBuffer)
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        
        // Handle byteStride for interleaved data
        const byteStride = bufferView.byteStride;
        const elementSize = componentCount * TypedArrayConstructor.BYTES_PER_ELEMENT;

        // If data is tightly packed (no stride or stride equals element size)
        if (!byteStride || byteStride === elementSize) {
             // Create a slice to ensure alignment for TypedArray constructor
             return new TypedArrayConstructor(binaryBuffer!.slice(byteOffset, byteOffset + totalComponents * TypedArrayConstructor.BYTES_PER_ELEMENT));
        }

        // Handle interleaved data by copying elements one by one
        const output = new TypedArrayConstructor(totalComponents);
        const bufferBytes = new Uint8Array(binaryBuffer!); // View as bytes for manual stride math
        const outputBytes = new Uint8Array(output.buffer);
        const bytesPerElement = TypedArrayConstructor.BYTES_PER_ELEMENT;
        const bytesPerComponent = componentCount * bytesPerElement;

        for (let i = 0; i < elementCount; i++) {
            const srcPos = byteOffset + i * byteStride;
            const destPos = i * bytesPerComponent;
            // Copy bytes directly to avoid alignment issues with the source
            for (let j = 0; j < bytesPerComponent; j++) {
                outputBytes[destPos + j] = bufferBytes[srcPos + j];
            }
        }
        return output;
    };

    // Containers for merged data
    const allPositions: Float32Array[] = [];
    const allNormals: Float32Array[] = [];
    const allColors: Float32Array[] = [];
    const allUVs: Float32Array[] = [];
    const allIndices: Uint16Array[] = [];
    
    let totalVertexCount = 0;
    let totalIndexCount = 0;
    let finalTexture: string | undefined = undefined;

    // 6. Iterate over ALL primitives and collect data
    for (const primitive of primitives) {
        // --- Positions ---
        const positionAccessorIndex = primitive.attributes.POSITION;
        if (positionAccessorIndex === undefined) continue; // Skip primitives without positions
        
        const positions = getAccessorData(positionAccessorIndex) as Float32Array;
        const vertexCount = positions.length / 3;
        allPositions.push(positions);

        // --- Normals ---
        const normalAccessorIndex = primitive.attributes.NORMAL;
        let normals: Float32Array;
        if (normalAccessorIndex !== undefined) {
            normals = getAccessorData(normalAccessorIndex) as Float32Array;
        } else {
            normals = new Float32Array(positions.length); // Zero normals
        }
        allNormals.push(normals);

        // --- Colors ---
        let colors: Float32Array;
        const colorAccessorIndex = primitive.attributes.COLOR_0;

        if (colorAccessorIndex !== undefined) {
            const accessor = gltf.accessors[colorAccessorIndex];
            const rawColors = getAccessorData(colorAccessorIndex);
            const componentType = accessor.componentType;
            const type = accessor.type;
            const count = accessor.count;

            if (componentType === 5126 && type === 'VEC3') {
                colors = rawColors as Float32Array;
            } else {
                colors = new Float32Array(count * 3);
                const isVec4 = type === 'VEC4';
                const srcStride = isVec4 ? 4 : 3;
                
                let normFactor = 1.0;
                if (componentType === 5121) normFactor = 255.0;
                if (componentType === 5123) normFactor = 65535.0;
                
                for (let i = 0; i < count; i++) {
                    colors[i * 3] = rawColors[i * srcStride] / normFactor;
                    colors[i * 3 + 1] = rawColors[i * srcStride + 1] / normFactor;
                    colors[i * 3 + 2] = rawColors[i * srcStride + 2] / normFactor;
                }
            }
        } else {
            // Fallback: Use material base color
            colors = new Float32Array(vertexCount * 3);
            let r = 1, g = 1, b = 1;

            if (primitive.material !== undefined) {
                const material = gltf.materials?.[primitive.material];
                const baseColorFactor = material?.pbrMetallicRoughness?.baseColorFactor;
                if (baseColorFactor) {
                    r = baseColorFactor[0];
                    g = baseColorFactor[1];
                    b = baseColorFactor[2];
                }
            }
            
            for (let k = 0; k < vertexCount; k++) {
                colors[k * 3] = r;
                colors[k * 3 + 1] = g;
                colors[k * 3 + 2] = b;
            }
        }
        allColors.push(colors);

        // --- UVs ---
        const uvAccessorIndex = primitive.attributes.TEXCOORD_0;
        let uvs: Float32Array;
        if (uvAccessorIndex !== undefined) {
            const accessor = gltf.accessors[uvAccessorIndex];
            const rawUVs = getAccessorData(uvAccessorIndex);
            const componentType = accessor.componentType;
            const count = accessor.count;
            
            if (componentType === 5126) {
                uvs = rawUVs as Float32Array;
            } else {
                uvs = new Float32Array(count * 2);
                let normFactor = 1.0;
                if (componentType === 5121) normFactor = 255.0;
                if (componentType === 5123) normFactor = 65535.0;
                
                for(let i=0; i < count * 2; i++) {
                    uvs[i] = rawUVs[i] / normFactor;
                }
            }
        } else {
             uvs = new Float32Array(vertexCount * 2); // Zero UVs
        }
        allUVs.push(uvs);

        // --- Indices ---
        const indicesAccessorIndex = primitive.indices;
        let indices: Uint16Array;
        if (indicesAccessorIndex !== undefined) {
            const rawIndices = getAccessorData(indicesAccessorIndex);
            if (rawIndices instanceof Uint16Array) {
                indices = rawIndices;
            } else {
                indices = new Uint16Array(rawIndices);
            }
        } else {
            indices = new Uint16Array(vertexCount);
            for (let i = 0; i < vertexCount; i++) {
                indices[i] = i;
            }
        }
        allIndices.push(indices);

        // --- Texture ---
        // We grab the texture from the first primitive that has one
        if (!finalTexture && primitive.material !== undefined) {
            const material = gltf.materials?.[primitive.material];
            const textureInfo = material?.pbrMetallicRoughness?.baseColorTexture;
            if (textureInfo) {
                const textureIndex = textureInfo.index;
                const tex = gltf.textures?.[textureIndex];
                const imageIndex = tex?.source;
                const image = gltf.images?.[imageIndex];
                
                if (image && image.bufferView !== undefined) {
                    const bv = gltf.bufferViews[image.bufferView];
                    const start = (bv.byteOffset || 0);
                    const len = bv.byteLength;
                    const imgBuffer = binaryBuffer!.slice(start, start + len);
                    const base64 = arrayBufferToBase64(imgBuffer);
                    const mime = image.mimeType || 'image/png';
                    finalTexture = `data:${mime};base64,${base64}`;
                } else if (image && image.uri && image.uri.startsWith('data:')) {
                    finalTexture = image.uri;
                }
            }
        }

        totalVertexCount += vertexCount;
        totalIndexCount += indices.length;
    }

    // 7. Merge all data into single TypedArrays
    const mergedPositions = new Float32Array(totalVertexCount * 3);
    const mergedNormals = new Float32Array(totalVertexCount * 3);
    const mergedColors = new Float32Array(totalVertexCount * 3);
    const mergedUVs = new Float32Array(totalVertexCount * 2);
    const mergedIndices = new Uint16Array(totalIndexCount);

    let vOffset = 0; // Vertex element offset (float count)
    let iOffset = 0; // Index offset (int count)
    let indexBase = 0; // Base value to add to indices

    for (let i = 0; i < allPositions.length; i++) {
        const pos = allPositions[i];
        const norm = allNormals[i];
        const col = allColors[i];
        const uv = allUVs[i];
        const ind = allIndices[i];

        mergedPositions.set(pos, vOffset);
        mergedNormals.set(norm, vOffset);
        mergedColors.set(col, vOffset);
        // UVs are 2 components per vertex, vOffset is 3. We track uvOffset separately or calculate
        mergedUVs.set(uv, (vOffset / 3) * 2);

        // Update indices: add current indexBase to every index
        for (let j = 0; j < ind.length; j++) {
            mergedIndices[iOffset + j] = ind[j] + indexBase;
        }

        const vertexCount = pos.length / 3;
        vOffset += pos.length;
        iOffset += ind.length;
        indexBase += vertexCount;
    }

    return { 
        positions: mergedPositions, 
        normals: mergedNormals, 
        indices: mergedIndices, 
        colors: mergedColors, 
        uvs: mergedUVs, 
        texture: finalTexture 
    };
}

// A generic TypedArray type for the helper function
type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Uint32Array
  | Float32Array;
