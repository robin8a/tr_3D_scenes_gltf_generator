
import type { Geometry } from './geometry';
import { parseMtl, type MaterialLibrary } from './mtlParser';

// Helper for vector operations
const subtract = (a: number[], b: number[]): number[] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]): number[] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: number[]): number[] => {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return len > 0.00001 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
};

export function parseObj(objText: string, mtlText?: string): Geometry {
  const materials: MaterialLibrary = mtlText ? parseMtl(mtlText) : new Map();
  const tempVertices: number[][] = [];
  const faces: { indices: number[]; material: string | null }[] = [];
  let currentMaterialName: string | null = null;

  const lines = objText.split('\n');

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const type = parts.shift();

    switch (type) {
      case 'v':
        tempVertices.push(parts.map(parseFloat));
        break;
      case 'usemtl':
        currentMaterialName = parts[0];
        break;
      case 'f':
        const faceIndices = parts
          .map(part => parseInt(part.split('/')[0], 10) - 1); // Get vertex index
        
        // Triangulate faces with more than 3 vertices (fan triangulation)
        for (let i = 1; i < faceIndices.length - 1; i++) {
          faces.push({
            indices: [faceIndices[0], faceIndices[i], faceIndices[i + 1]],
            material: currentMaterialName,
          });
        }
        break;
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let currentIndex = 0;

  // Decide upfront if this model will have vertex colors based on MTL content
  const hasMaterialColors = Array.from(materials.values()).some(m => m.kd);

  for (const face of faces) {
    if (face.indices.some(isNaN) || face.indices.length !== 3) continue;
    
    const v1 = tempVertices[face.indices[0]];
    const v2 = tempVertices[face.indices[1]];
    const v3 = tempVertices[face.indices[2]];

    if (!v1 || !v2 || !v3) continue; // Skip if indices are out of bounds

    const edge1 = subtract(v2, v1);
    const edge2 = subtract(v3, v1);
    const normal = normalize(cross(edge1, edge2));

    positions.push(...v1, ...v2, ...v3);
    normals.push(...normal, ...normal, ...normal);

    if (hasMaterialColors) {
      let faceColor: [number, number, number] = [0.8, 0.8, 0.8]; // Default gray
      if (face.material) {
        const material = materials.get(face.material);
        if (material?.kd) {
          faceColor = material.kd;
        }
      }
      colors.push(...faceColor, ...faceColor, ...faceColor);
    }
    
    indices.push(currentIndex, currentIndex + 1, currentIndex + 2);
    currentIndex += 3;
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    colors: hasMaterialColors ? new Float32Array(colors) : undefined,
  };
}
