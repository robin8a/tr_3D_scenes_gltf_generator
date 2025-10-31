import type { Shape } from './gltfBuilder';
import type { Geometry } from './geometry';
import { createTree, createRock } from './stockModels';
import { parseObj } from './objParser';

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
interface CustomModelData {
    obj: string;
    mtl?: string;
}
export interface CustomModels {
    tree?: CustomModelData;
    rock?: CustomModelData;
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
    const treeModel = customModels.tree?.obj ? parseObj(customModels.tree.obj, customModels.tree.mtl) : createTree();
    const rockModel = customModels.rock?.obj ? parseObj(customModels.rock.obj, customModels.rock.mtl) : createRock();

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
            
            let yLevel = 0.0;
            let color: [number, number, number, number] = [0.5, 0.5, 0.5, 1.0]; // Default color

            switch (featureType) {
                case 'asset':
                    yLevel = 0.0;
                    color = [0.8, 0.8, 0.8, 1.0]; // Light gray
                    break;
                case 'grass':
                    yLevel = 0.01;
                    color = [0.3, 0.6, 0.3, 1.0]; // Green
                    break;
                case 'river':
                    yLevel = 0.005; // Slightly lower than grass
                    color = [0.3, 0.5, 0.8, 1.0]; // Blue
                    break;
                case 'rock': // Rock terrain, not object
                     yLevel = 0.015;
                     color = [0.45, 0.45, 0.45, 1.0]; // Darker gray
                     break;
                default:
                    continue; // Skip unknown terrain types
            }
            
            projectedPolygon.forEach((p, i) => {
                positions[i * 3] = p[0];
                positions[i * 3 + 1] = yLevel;
                positions[i * 3 + 2] = p[1];
                normals[i * 3] = 0;
                normals[i * 3 + 1] = 1; // Pointing straight up
                normals[i * 3 + 2] = 0;
            });
            
            const geometry: Geometry = {
                positions,
                normals,
                indices: new Uint16Array(indices),
            };

            shapes.push({
                geometry,
                translation: [0, 0, 0],
                color
            });
        }
    }
    return shapes;
}
