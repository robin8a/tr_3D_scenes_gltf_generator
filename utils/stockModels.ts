
import type { Geometry } from './geometry';
import { parseObj } from './objParser';

// --- Tree Asset Data ---
const treeMtlString = `
# Tree material
newmtl Trunk
Kd 0.36 0.25 0.20 # Brown color for the trunk

newmtl Canopy
Kd 0.13 0.54 0.13 # Green color for the canopy
`;

const treeObjString = `
# Low-poly Tree
mtllib tree.mtl

# Trunk (Cylinder-like)
v 0.0 0.0 0.25
v 0.25 0.0 0.0
v 0.0 0.0 -0.25
v -0.25 0.0 0.0
v 0.0 2.0 0.25
v 0.25 2.0 0.0
v 0.0 2.0 -0.25
v -0.25 2.0 0.0

# Canopy (Icosahedron-like)
v 0.0 4.0 0.0
v 0.89 2.5 0.52
v -0.34 2.5 1.17
v -1.13 2.5 0.12
v -0.58 2.5 -1.05
v 0.72 2.5 -0.85
v 0.58 1.0 1.05
v -0.72 1.0 0.85
v -0.89 1.0 -0.52
v 0.34 1.0 -1.17
v 1.13 1.0 -0.12

usemtl Trunk
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8
f 1 4 3 2

usemtl Canopy
f 9 10 11
f 9 11 12
f 9 12 13
f 9 13 14
f 9 14 10
f 15 16 10
f 16 17 11
f 17 18 12
f 18 19 13
f 19 20 14
f 10 16 11
f 11 17 12
f 12 18 13
f 13 19 14
f 14 20 10
f 15 10 20
f 16 15 17
f 17 15 18
f 18 15 19
f 19 15 20
`;

// --- Rock Asset Data ---
const rockMtlString = `
# Rock material
newmtl RockSurface
Kd 0.5 0.5 0.5 # Medium grey color for the rock
`;

const rockObjString = `
# Low-poly Rock
mtllib rock.mtl

v 0.0 0.0 1.0
v 0.866 0.0 -0.5
v -0.866 0.0 -0.5
v 0.0 1.5 0.0
v 0.4 0.2 -0.8
v -0.5 0.3 -0.7
v 0.7 0.1 0.6
v -0.6 0.2 0.7

usemtl RockSurface
f 1 2 3
f 1 2 4
f 2 3 4
f 3 1 4
f 1 7 8
f 2 5 7
f 3 6 8
f 5 6 3
f 5 2 3
f 6 8 1
f 7 5 3
`;

// --- Caching and Creator Functions ---
let cachedTree: Geometry | null = null;
let cachedRock: Geometry | null = null;

export function createTree(): Geometry {
  if (cachedTree) {
    return cachedTree;
  }
  cachedTree = parseObj(treeObjString, treeMtlString);
  return cachedTree;
}

export function createRock(): Geometry {
  if (cachedRock) {
    return cachedRock;
  }
  cachedRock = parseObj(rockObjString, rockMtlString);
  return cachedRock;
}
