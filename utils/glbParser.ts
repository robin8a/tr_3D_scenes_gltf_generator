
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

/**
 * Parses a GLB file's ArrayBuffer to extract geometry from its first mesh.
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
    if (chunkOffset < dataView.byteLength) {
        const binChunkLength = dataView.getUint32(chunkOffset, true);
        chunkOffset += 4;
        const binChunkType = dataView.getUint32(chunkOffset, true);
        chunkOffset += 4;
        if (binChunkType !== CHUNK_TYPE.BIN) {
            throw new Error('Invalid GLB: Second chunk must be BIN.');
        }
        binaryBuffer = arrayBuffer.slice(chunkOffset, chunkOffset + binChunkLength);
    }
    
    if (!binaryBuffer) {
        throw new Error('GLB file does not contain a binary buffer chunk.');
    }
    
    // 4. Find the first mesh and primitive to extract data from
    const mesh = gltf.meshes?.[0];
    const primitive = mesh?.primitives?.[0];
    if (!primitive) {
        throw new Error('GLB file does not contain a mesh with primitives.');
    }
    
    // 5. Helper function to get TypedArray data from an accessor
    const getAccessorData = (accessorIndex: number): TypedArray => {
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const TypedArray = COMPONENT_TYPE_MAP[accessor.componentType];
        const componentCount = TYPE_COMPONENT_COUNT_MAP[accessor.type];
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        const elementCount = accessor.count;
        const totalComponents = elementCount * componentCount;
        
        if (!TypedArray) {
            throw new Error(`Unsupported component type: ${accessor.componentType}`);
        }

        return new TypedArray(binaryBuffer, byteOffset, totalComponents);
    };

    // 6. Extract positions, normals, and indices
    const positionAccessorIndex = primitive.attributes.POSITION;
    const normalAccessorIndex = primitive.attributes.NORMAL;
    const indicesAccessorIndex = primitive.indices;

    if (positionAccessorIndex === undefined || normalAccessorIndex === undefined || indicesAccessorIndex === undefined) {
        throw new Error('Mesh primitive is missing POSITION, NORMAL, or indices attributes.');
    }

    const positions = getAccessorData(positionAccessorIndex) as Float32Array;
    const normals = getAccessorData(normalAccessorIndex) as Float32Array;
    
    const rawIndices = getAccessorData(indicesAccessorIndex);
    // Our internal format uses Uint16Array, so convert if necessary.
    // This is a simplification; large models might overflow, but it's suitable for this app.
    const indices = rawIndices instanceof Uint16Array ? rawIndices : new Uint16Array(rawIndices);
    
    // Vertex colors are ignored for simplicity; the main material will be used.
    
    return { positions, normals, indices, colors: undefined };
}

// A generic TypedArray type for the helper function
type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Uint32Array
  | Float32Array;
