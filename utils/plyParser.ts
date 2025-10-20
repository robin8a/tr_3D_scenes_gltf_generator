
import type { Geometry } from './geometry';

// Vector math helpers
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

export function parsePly(plyText: string): Geometry {
  const lines = plyText.split('\n');
  let headerEnd = 0;
  let vertexCount = 0;
  let faceCount = 0;
  
  const propertyMap: { [key: string]: number } = {};
  let currentPropertyIndex = 0;
  let readingVerts = false;

  // --- Parse header ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const parts = line.split(/\s+/);

    if (parts[0] === 'element') {
      if (parts[1] === 'vertex') {
        vertexCount = parseInt(parts[2]);
        readingVerts = true;
      } else if (parts[1] === 'face') {
        faceCount = parseInt(parts[2]);
        readingVerts = false;
      } else {
        readingVerts = false;
      }
    } else if (parts[0] === 'property' && readingVerts) {
      // Map properties like 'x', 'y', 'z', 'red', 'green', 'blue' to their index in a vertex line
      propertyMap[parts[2]] = currentPropertyIndex++;
    } else if (parts[0] === 'end_header') {
      headerEnd = i + 1;
      break;
    }
  }

  const x_idx = propertyMap['x'];
  const y_idx = propertyMap['y'];
  const z_idx = propertyMap['z'];
  const r_idx = propertyMap['red'];
  const g_idx = propertyMap['green'];
  const b_idx = propertyMap['blue'];

  if (x_idx === undefined || y_idx === undefined || z_idx === undefined) {
    throw new Error('PLY file must contain x, y, and z vertex properties.');
  }
  const hasColors = r_idx !== undefined && g_idx !== undefined && b_idx !== undefined;

  const tempVertices: number[][] = [];
  const tempColors: number[][] = [];
  
  // --- Parse vertices ---
  for (let i = 0; i < vertexCount; i++) {
    const parts = lines[headerEnd + i].trim().split(/\s+/).map(parseFloat);
    tempVertices.push([parts[x_idx], parts[y_idx], parts[z_idx]]);
    if (hasColors) {
      // Normalize colors from 0-255 range to 0-1
      tempColors.push([parts[r_idx] / 255.0, parts[g_idx] / 255.0, parts[b_idx] / 255.0]);
    }
  }

  const faces: number[][] = [];
  // --- Parse faces ---
  const faceDataStart = headerEnd + vertexCount;
  for (let i = 0; i < faceCount; i++) {
    const line = lines[faceDataStart + i];
    if (!line) continue;
    
    const parts = line.trim().split(/\s+/).map(p => parseInt(p, 10));
    const numVerts = parts.shift();
    if (numVerts && numVerts >= 3) {
      // Triangulate faces with more than 3 vertices (fan triangulation)
      for (let j = 1; j < parts.length - 1; j++) {
        faces.push([parts[0], parts[j], parts[j + 1]]);
      }
    }
  }

  // --- De-index data and generate normals ---
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let currentIndex = 0;

  for (const face of faces) {
    if (face.some(isNaN) || face.length !== 3) continue;

    const v1 = tempVertices[face[0]];
    const v2 = tempVertices[face[1]];
    const v3 = tempVertices[face[2]];
    if (!v1 || !v2 || !v3) continue;
    
    const edge1 = subtract(v2, v1);
    const edge2 = subtract(v3, v1);
    const normal = normalize(cross(edge1, edge2));

    positions.push(...v1, ...v2, ...v3);
    normals.push(...normal, ...normal, ...normal);

    if (hasColors) {
      const c1 = tempColors[face[0]];
      const c2 = tempColors[face[1]];
      const c3 = tempColors[face[2]];
      colors.push(...c1, ...c2, ...c3);
    }
    
    indices.push(currentIndex, currentIndex + 1, currentIndex + 2);
    currentIndex += 3;
  }
  
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    colors: hasColors && colors.length > 0 ? new Float32Array(colors) : undefined,
  };
}
