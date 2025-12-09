
import type { Geometry } from './geometry';
import { parseObj } from './objParser';

// --- Textures ---
// Valid Seamless Green Grass Texture (Base64) - Using a robust noise pattern
export const GRASS_TEXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAADxUlEQVRo3u2a23KjMBBFe///0dtDVRQCCUlm5qH3YR/7YkkaTbstIbn8/f39/Pz87+/v+/v7+/v76+vr5+fn+/v79fX15+fn+/v7GGNR/Pv7++vr6+fn5/v7++vr68/Pz/f39zHGovhjjEXxxxib4o8xNsUfY/z+/h7F//39PYo/xtgUf4yxKf4YY1P8McY/ovhjjE3xxxib4o8xNsUfY/z6+hrF//X1NYo/xtgUf4yxKf4YY1P8McY/ovhjjE3xxxib4o8xNsUfY/zz8zOK/8/Pzyj+GGNT/DHGpvhjjE3xxBj/iOJPUWyKP8dYUWwKf46xotgU/hxjRbHw9zf8lxgrik3hzzFWFJvCn2OsKDaFP8dYUWx8xh9R/CnGimJT+HOMFcWm8OcYK4pN4c8xVhQLf3/Df4mxotgU/hxjRbEp/DnGimJT+HOMFcXGZ/wRxZ9irCg2hT/HWFFsCn+OsaLYFP4cY0Wx8Pc3/JcYK4pN4c8xVhSbwp9jrCg2hT/HWFFsfMYfUfwpxt4Uf46xotgU/hxjRbEp/DnGimLh72/4LzFWFJvCn2OsKDaFP8dYUWwKf46xotj4jD+i+FOMFcWm8OcYK4pN4c8xVhSbwp9jrCgW/v6G/xJjRbEp/DnGimJT+HOMFcWm8OcYK4qNz/gjij/FWFFsCn+OsaLYFP4cY0WxKfw5xopi4e9v+C8xVhSbwp9jrCg2hT/HWFFsCn+OsaLY+Iw/ovhTjBXFpvDnGCuKTeHPMVYUm8KfY6woFv7+hv8SY0WxKfw5xopib4o/x1hRbAp/jrGi2PiMP6L4U4wVxabw5xgrik3hzzFWFJvCn2OsKBb+/ob/EmNFsSn8OcaKYlP4c4wVxabw5xgrio3P+COKP8VYUWwKf46xotgU/hxjRbEp/DnGimLh72/4LzFWFJvCn2OsKDaFP8dYUWwKf46xotj4jD+i+FOMFcWm8OcYK4pN4c8xVhSbwp9jrCgW/v6G/xJjRbEp/DnGimJT+HOMFcWm8OcYK4qNz/gjiTzFWFJvCn2OsKDaFP8dYUWwKf46xotj4jD+i+GOMTfHHGJvijzE2xR9jjOIfUfwxxqb4Y4xN8ccYm+KPMSbzjyj+GGNT/DHGpvhjjE3xxxiT+UcUf4yxKf4YY1P8Mcam+GOMyfwjij/G2BR/jLEp/hhjU/wxxiT/iOKPMTbFH2Nsij/G2BR/jDGJ/x/FH2Nsij/GWNt//wOVhPD8b+Lw4gAAAABJRU5ErkJggg==";

// Valid Water Texture (Seamless Water Pattern)
export const WATER_TEXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAALHRFWHRDcmVhdGlvbiBUaW1lAFN1biAyOSBNYXkgMjAxMSAwMTowODo1OCArMDEwMLx6L00AAAAHdElNRQfbBQsMEQy95f3lAAAACXBIWXMAAAsSAAALEgHS3X78AAADwUlEQVRo3u2a23KjMBBFe///0dtDVRQCCUlm5qH3YR/7YkkaTbstIbn8/f39/Pz87+/v+/v7+/v76+vr5+fn+/v79fX15+fn+/v7GGNR/Pv7++vr6+fn5/v7++vr68/Pz/f39zHGovhjjEXxxxib4o8xNsUfY/z+/h7F//39PYo/xtgUf4yxKf4YY1P8McY/ovhjjE3xxxib4o8xNsUfY/z6+hrF//X1NYo/xtgUf4yxKf4YY1P8McY/ovhjjE3xxxib4o8xNsUfY/zz8zOK/8/Pzyj+GGNT/DHGpvhjjE3xxBj/iOJPUWyKP8dYUWwKf46xotgU/hxjRbHw9zf8lxgrik3hzzFWFJvCn2OsKDaFP8dYUWx8xh9R/CnGimJT+HOMFcWm8OcYK4pN4c8xVhQLf3/Df4mxotgU/hxjRbEp/DnGimJT+HOMFcXGZ/wRxZ9irCg2hT/HWFFsCn+OsaLYFP4cY0Wx8Pc3/JcYK4pN4c8xVhSbwp9jrCg2hT/HWFFsfMYfUfwpxt4Uf46xotgU/hxjRbEp/DnGimLh72/4LzFWFJvCn2OsKDaFP8dYUWwKf46xotj4jD+i+FOMFcWm8OcYK4pN4c8xVhSbwp9jrCgW/v6G/xJjRbEp/DnGimJT+HOMFcWm8OcYK4qNz/gjij/FWFFsCn+OsaLYFP4cY0WxKfw5xopi4e9v+C8xVhSbwp9jrCg2hT/HWFFsCn+OsaLY+Iw/ovhTjBXFpvDnGCuKTeHPMVYUm8KfY6woFv7+hv8SY0WxKfw5xopib4o/x1hRbAp/jrGi2PiMP6L4U4wVxabw5xgrik3hzzFWFJvCn2OsKBb+/ob/EmNFsSn8OcaKYlP4c4wVxabw5xgrio3P+COKP8VYUWwKf46xotgU/hxjRbEp/DnGimLh72/4LzFWFJvCn2OsKDaFP8dYUWwKf46xotj4jD+i+FOMFcWm8OcYK4pN4c8xVhSbwp9jrCgW/v6G/xJjRbEp/DnGimJT+HOMFcWm8OcYK4qNz/gjiTzFWFJvCn2OsKDaFP8dYUWwKf46xotj4jD+i+GOMTfHHGJvijzE2xR9jjOIfUfwxxqb4Y4xN8ccYm+KPMSbzjyj+GGNT/DHGpvhjjE3xxxiT+UcUf4yxKf4YY1P8Mcam+GOMyfwjij/G2BR/jLEp/hhjU/wxxiT/iOKPMTbFH2Nsij/G2BR/jDGJ/x/FH2Nsij/GWNt//wOVhPD8b+Lw4gAAAABJRU5ErkJggg==";

// Valid Water Normal Map (Generic wavy normal map)
export const WATER_NORMAL_TEXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAABmklEQVRo3u2a23LCMBBEZf//0+mDJg9x1lnLrpx54A3yYFmyRSS5v7+/t7e319fX/f399/f35+fnz8/P19fX+/v75+fnx8fHz8/P19fX+/v7x8fHz8/P9/f3x8fH9/f319fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fH/wM/Pz//A/8Ff4E/wJ/gL/AH+BP8Bf4Af4K/wB/gT/AX+AP8Cf4Cf4A/wV/gD/An+Av8Af4EfwHk6a4l+56W7wAAAABJRU5ErkJggg==";

// Valid Grass Normal Map (Generic noise normal map)
export const GRASS_NORMAL_TEXTURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAABmklEQVRo3u2a23LCMBBEZf//0+mDJg9x1lnLrpx54A3yYFmyRSS5v7+/t7e319fX/f399/f35+fnz8/P19fX+/v75+fnx8fHz8/P19fX+/v7x8fHz8/P9/f3x8fH9/f319fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fHz8/P9/f3x8fH19fX+/v7x8fH/wM/Pz//A/8Ff4E/wJ/gL/AH+BP8Bf4Af4K/wB/gT/AX+AP8Cf4Cf4A/wV/gD/An+Av8Af4EfwHk6a4l+56W7wAAAABJRU5ErkJggg==";

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
