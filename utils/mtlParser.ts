
export interface Material {
  kd?: [number, number, number]; // Diffuse color
}

export type MaterialLibrary = Map<string, Material>;

export function parseMtl(mtlText: string): MaterialLibrary {
  const materials: MaterialLibrary = new Map();
  let currentMaterial: Material | null = null;
  let currentMaterialName: string | null = null;

  const lines = mtlText.split('\n');

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const type = parts.shift();

    if (!type || type.startsWith('#')) continue;

    switch (type) {
      case 'newmtl':
        // Start a new material
        currentMaterialName = parts[0];
        if (currentMaterialName) {
            currentMaterial = {};
            materials.set(currentMaterialName, currentMaterial);
        }
        break;
      case 'Kd':
        // Diffuse color
        if (currentMaterial && parts.length >= 3) {
          currentMaterial.kd = [
            parseFloat(parts[0]),
            parseFloat(parts[1]),
            parseFloat(parts[2]),
          ];
        }
        break;
      // Other properties like Ka, Ks, Ns, map_Kd could be handled here
      // but are ignored for simplicity.
    }
  }

  return materials;
}
