
import type { Shape } from './gltfBuilder';
import type { Geometry } from './geometry';
import { createTree, createRock, GRASS_TEXTURE, WATER_TEXTURE } from './stockModels';
import { parseObj } from './objParser';
import { parseGlb } from './glbParser';

// GeoJSON type definitions for clarity
type Point = [number, number];
type Polygon = Point[][];
interface Feature {
    type: 'Feature';
    geometry: {
        type: 'Polygon';
        coordinates: Polygon;
    };
    properties: {
        type: string;
        [key: string]: any;
    };
}
interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
}

// Custom model type definitions
export interface CustomModelData {
    obj?: string;
    mtl?: string;
    objFileName?: string;
    mtlFileName?: string;
    glb?: ArrayBuffer;
    glbFileName?: string;
}
export interface CustomModels {
    tree?: CustomModelData;
    rock?: CustomModelData;
    grass?: CustomModelData; // Support for custom grass model
}

/**
 * Triangulates a simple polygon using a basic fan algorithm from the first vertex.
 * Assumes the polygon is mostly convex.
 * @param polygon - An array of 2D points [x, z].
 * @returns An array of indices representing the triangles.
 */
function triangulate(polygon: Point[]): number[] {
    const indices: number[] = [];
    if (polygon.length < 3) return indices;

    for (let i = 1; i < polygon.length - 1; i++) {
        indices.push(0, i, i + 1);
    }
    return indices;
}

/**
 * Calculates the approximate centroid of a polygon by averaging its vertices.
 * @param polygon - An array of 2D points [x, z].
 * @returns The centroid point [x, z].
 */
function getCentroid(polygon: Point[]): Point {
    if (polygon.length === 0) return [0, 0];
    let sumX = 0;
    let sumZ = 0;
    for (const p of polygon) {
        sumX += p[0];
        sumZ += p[1];
    }
    return [sumX / polygon.length, sumZ / polygon.length];
}

/**
 * Generates a random point inside a triangle using barycentric coordinates.
 */
function getRandomPointInTriangle(p1: Point, p2: Point, p3: Point): Point {
    const r1 = Math.random();
    const r2 = Math.random();
    const sqrtR1 = Math.sqrt(r1);
    const A = 1 - sqrtR1;
    const B = sqrtR1 * (1 - r2);
    const C = sqrtR1 * r2;
    return [
        A * p1[0] + B * p2[0] + C * p3[0],
        A * p1[1] + B * p2[1] + C * p3[1]
    ];
}


async function getModel(modelData: CustomModelData | undefined, stockModelFn: () => Geometry): Promise<Geometry> {
    if (modelData?.glb) {
        return parseGlb(modelData.glb);
    }
    if (modelData?.obj) {
        return parseObj(modelData.obj, modelData.mtl);
    }
    return stockModelFn();
}

export async function parseGeoJsonToShapes(geojsonString: string, customModels: CustomModels = {}): Promise<Shape[]> {
    const shapes: Shape[] = [];
    const geojson: FeatureCollection = JSON.parse(geojsonString);

    // Find the main asset boundary to establish scene center and scale
    const assetFeature = geojson.features.find(f => f.properties.type === 'asset');
    if (!assetFeature) {
        throw new Error("GeoJSON must contain a feature with 'type: \"asset\"' to define the boundary.");
    }

    const assetCoords = assetFeature.geometry.coordinates[0];
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;

    for (const [lon, lat] of assetCoords) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
    }
    
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    // Scale factor to convert tiny lat/lon differences into meters for the 3D scene
    const lonRange = maxLon - minLon;
    const latRange = maxLat - minLat;
    const maxRange = Math.max(lonRange, latRange);
    // Aim for the largest dimension to be around 20 units
    const scale = maxRange > 0 ? 20 / maxRange : 1000;


    const project = ([lon, lat]: Point): Point => {
        return [(lon - centerLon) * scale, (lat - centerLat) * scale * -1]; // Invert Z-axis
    };

    // Pre-create models so they are not re-parsed for every feature
    const treeModel = await getModel(customModels.tree, createTree);
    const rockModel = await getModel(customModels.rock, createRock);
    
    // Only create grass model if provided custom, otherwise we just use texture
    let grassModel: Geometry | null = null;
    if (customModels.grass) {
        // Fallback to empty geometry if loading fails, but getModel handles most logic
        grassModel = await getModel(customModels.grass, () => ({ positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint16Array(0) }));
    }

    for (const feature of geojson.features) {
        if (feature.geometry.type !== 'Polygon') continue;

        const projectedPolygon = feature.geometry.coordinates[0].map(project);
        const featureType = feature.properties.type;

        if (featureType === 'tree' || featureType === 'rock') {
            const centroid = getCentroid(projectedPolygon);
            shapes.push({
                geometry: featureType === 'tree' ? treeModel : rockModel,
                translation: [centroid[0], 0, centroid[1]],
            });
        } else {
            // It's a terrain polygon
            const indices = triangulate(projectedPolygon);
            const positions = new Float32Array(projectedPolygon.flat().length * 1.5); // x,y,z for each point
            const normals = new Float32Array(projectedPolygon.flat().length * 1.5);
            const uvs = new Float32Array(projectedPolygon.flat().length); // 2 floats per vertex
            
            let yLevel = 0.0;
            let color: [number, number, number, number] = [0.5, 0.5, 0.5, 1.0]; // Default color
            let texture: string | undefined = undefined;
            let uvScale = 1.0;

            switch (featureType) {
                case 'asset':
                    yLevel = 0.0;
                    color = [0.8, 0.8, 0.8, 1.0]; // Light gray
                    break;
                case 'grass':
                    yLevel = 0.01;
                    color = [0.3, 0.6, 0.3, 1.0]; // Green fallback
                    texture = GRASS_TEXTURE;
                    uvScale = 0.5; // Controls texture tiling
                    break;
                case 'river':
                    yLevel = 0.005; // Slightly lower than grass
                    color = [1.0, 1.0, 1.0, 1.0]; // White, so texture shows true colors
                    texture = WATER_TEXTURE;
                    uvScale = 0.5;
                    break;
                case 'rock': // Rock terrain, not object
                     yLevel = 0.015;
                     color = [0.45, 0.45, 0.45, 1.0]; // Darker gray
                     break;
                default:
                    continue; // Skip unknown terrain types
            }
            
            projectedPolygon.forEach((p, i) => {
                // Positions
                positions[i * 3] = p[0];
                positions[i * 3 + 1] = yLevel;
                positions[i * 3 + 2] = p[1];
                
                // Normals (pointing straight up)
                normals[i * 3] = 0;
                normals[i * 3 + 1] = 1;
                normals[i * 3 + 2] = 0;

                // UVs (Planar mapping)
                uvs[i * 2] = p[0] * uvScale;
                uvs[i * 2 + 1] = p[1] * uvScale;
            });
            
            const geometry: Geometry = {
                positions,
                normals,
                indices: new Uint16Array(indices),
                uvs,
                texture
            };

            // Add the base terrain shape
            shapes.push({
                geometry,
                translation: [0, 0, 0],
                color
            });

            // If it's grass and we have a custom model, distribute it!
            if (featureType === 'grass' && grassModel) {
                const density = 2.0; // Objects per square unit
                
                for (let i = 0; i < indices.length; i += 3) {
                    const i1 = indices[i];
                    const i2 = indices[i+1];
                    const i3 = indices[i+2];
                    
                    // Extract X, Z from positions (Y is index+1)
                    const p1: Point = [positions[i1*3], positions[i1*3+2]];
                    const p2: Point = [positions[i2*3], positions[i2*3+2]];
                    const p3: Point = [positions[i3*3], positions[i3*3+2]];
                    
                    // Calculate Area of triangle
                    // Area = 0.5 * |x1(z2 - z3) + x2(z3 - z1) + x3(z1 - z2)|
                    const area = 0.5 * Math.abs(p1[0]*(p2[1]-p3[1]) + p2[0]*(p3[1]-p1[1]) + p3[0]*(p1[1]-p2[1]));
                    
                    const count = Math.floor(area * density);
                    
                    for (let k = 0; k < count; k++) {
                        const pt = getRandomPointInTriangle(p1, p2, p3);
                        
                        // Random rotation around Y axis
                        const angle = Math.random() * Math.PI * 2;
                        const rotQ: [number, number, number, number] = [0, Math.sin(angle/2), 0, Math.cos(angle/2)];
                        
                        // Random scale variation (0.8 to 1.2)
                        const scaleVar = 0.8 + Math.random() * 0.4;
                        
                        shapes.push({
                            geometry: grassModel,
                            translation: [pt[0], yLevel, pt[1]],
                            rotation: rotQ,
                            scale: [scaleVar, scaleVar, scaleVar],
                            color: [1, 1, 1, 1] // Keep model colors
                        });
                    }
                }
            }
        }
    }
    return shapes;
}
