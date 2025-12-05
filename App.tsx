
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { buildGltf, buildGlb, type Shape } from './utils/gltfBuilder';
import { parseGeoJsonToShapes, type CustomModels, type CustomModelData } from './utils/geojsonParser';
import { DownloadIcon, UploadIcon, FolderOpenIcon, TrashIcon } from './components/icons';
import { createCube, createPyramid, createSphere } from './utils/geometry';

const App: React.FC = () => {
  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const [sceneShapes, setSceneShapes] = useState<Shape[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sceneTitle, setSceneTitle] = useState<string>('Loading Initial Scene...');
  const [customModels, setCustomModels] = useState<CustomModels>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a default scene on initial load
  useEffect(() => {
    const generateDefaultScene = () => {
      try {
        const cube = createCube(1.5);
        const pyramid = createPyramid(1.5, 1.5);
        const sphere = createSphere(0.8);

        const shapes: Shape[] = [
          { geometry: cube, translation: [-2.5, 0, 0], color: [1, 0.2, 0.2, 1] }, // Red
          { geometry: pyramid, translation: [0, 0, 0], color: [0.2, 1, 0.2, 1] }, // Green
          { geometry: sphere, translation: [2.5, 0, 0], color: [0.2, 0.2, 1, 1] }, // Blue
        ];
        
        setSceneShapes(shapes);
        const gltfJsonString = buildGltf(shapes);
        const blob = new Blob([gltfJsonString], { type: 'model/gltf+json' });
        const url = URL.createObjectURL(blob);

        setSceneUrl(url);
        setSceneTitle("Default Scene: Basic Shapes");

      } catch (err) {
        console.error("Failed to create default scene:", err);
        setError("Could not generate the initial default scene.");
      } finally {
        setIsLoading(false);
      }
    };
    
    generateDefaultScene();
    
    return () => {
      if (sceneUrl) {
        URL.revokeObjectURL(sceneUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.geojson') && !file.name.toLowerCase().endsWith('.json')) {
        setError('Invalid file type. Please upload a GeoJSON (.geojson, .json) file.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setSceneShapes([]);
    setSceneUrl(url => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });

    try {
      const geojsonText = await file.text();
      const shapes = await parseGeoJsonToShapes(geojsonText, customModels);
      
      if (shapes.length === 0) {
          throw new Error("The GeoJSON file did not result in any visible 3D objects.");
      }
      
      setSceneShapes(shapes);
      const gltfJsonString = buildGltf(shapes);
      const blob = new Blob([gltfJsonString], { type: 'model/gltf+json' });
      const url = URL.createObjectURL(blob);
      
      setSceneUrl(url);
      setSceneTitle(`Scene: ${file.name}`);

    } catch (err) {
      console.error("Failed to process GeoJSON file:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`An error occurred: ${message}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
    }
  }, [customModels]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCustomModelChange = (type: 'tree' | 'rock' | 'grass', fileType: 'obj' | 'mtl' | 'glb', file: File | null) => {
    if (!file) return;

    if (fileType === 'glb') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            setCustomModels(prev => ({
                ...prev,
                [type]: {
                    glb: buffer,
                    glbFileName: file.name
                }
            }));
        };
        reader.readAsArrayBuffer(file);
    } else { // obj or mtl
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setCustomModels(prev => {
                const existing = { ...prev[type] };
                delete existing.glb;
                delete existing.glbFileName;
                return {
                    ...prev,
                    [type]: {
                        ...existing,
                        [fileType]: text,
                        [`${fileType}FileName`]: file.name
                    }
                }
            });
        };
        reader.readAsText(file);
    }
  };
  
  const clearCustomModel = (type: 'tree' | 'rock' | 'grass') => {
      setCustomModels(prev => {
          const { [type]: _, ...rest } = prev;
          return rest;
      });
  };

  const handleDownload = (format: 'gltf' | 'glb') => {
    if (!sceneShapes.length) return;

    const triggerDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (format === 'gltf') {
        const gltfJsonString = buildGltf(sceneShapes);
        const blob = new Blob([gltfJsonString], { type: 'model/gltf+json' });
        triggerDownload(blob, 'scene.gltf');
    } else {
        const glbBuffer = buildGlb(sceneShapes);
        const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
        triggerDownload(blob, 'scene.glb');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-5xl">
        <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500 mb-2">
                3D Scene Generator
            </h1>
            <p className="text-lg text-gray-400">
                {sceneTitle}
            </p>
        </header>

        <main className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-4 md:p-6">
            <div className="w-full h-96 md:h-[500px] bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-600 relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/80 z-10 rounded-lg">
                        <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-lg">Generating Scene...</p>
                    </div>
                )}
                {error && !isLoading && (
                    <div className="p-4 text-center">
                        <p className="text-red-400 font-semibold">Error</p>
                        <p className="text-red-300 mt-2">{error}</p>
                    </div>
                )}
                {sceneUrl && !isLoading && !error && (
                    <model-viewer
                    src={sceneUrl}
                    alt={sceneTitle}
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    camera-controls
                    auto-rotate
                    shadow-intensity="1"
                    style={{ width: '100%', height: '100%', '--poster-color': 'transparent', borderRadius: '8px' }}
                    ></model-viewer>
                )}
            </div>
            
            {sceneUrl && !isLoading && !error && (
                <div className="text-center mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button
                        onClick={() => handleDownload('gltf')}
                        className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Download .gltf
                    </button>
                    <button
                        onClick={() => handleDownload('glb')}
                        className="w-full sm:w-auto inline-flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Download .glb
                    </button>
                </div>
            )}
        </main>
        
        <div className="my-8 border-t border-gray-700/50"></div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* GeoJSON Uploader */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-cyan-400 mb-3">Generate from Blueprint</h2>
                <p className="text-gray-400 mb-6">Upload a GeoJSON file to construct a scene from geographic data.</p>
                <input
                    type="file"
                    accept=".geojson,.json,application/json"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isLoading}
                />
                <button
                    onClick={handleUploadClick}
                    disabled={isLoading}
                    className="w-full max-w-xs bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center"
                >
                    <UploadIcon className="w-5 h-5 mr-2" />
                    Upload GeoJSON File
                </button>
            </div>

            {/* Custom Models */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-cyan-400 mb-3 text-center">Use Custom Models</h2>
                <p className="text-gray-400 mb-6 text-center">Optionally, provide your own models for objects in the GeoJSON file.</p>
                <div className="space-y-6">
                    <CustomModelUploader
                        type="tree"
                        modelData={customModels.tree}
                        onChange={handleCustomModelChange}
                        onClear={clearCustomModel}
                    />
                    <CustomModelUploader
                        type="rock"
                        modelData={customModels.rock}
                        onChange={handleCustomModelChange}
                        onClear={clearCustomModel}
                    />
                     <CustomModelUploader
                        type="grass"
                        modelData={customModels.grass}
                        onChange={handleCustomModelChange}
                        onClear={clearCustomModel}
                    />
                </div>
            </div>
        </section>

        <footer className="mt-12 text-center text-sm text-gray-500">
            <p>Generated files are in glTF 2.0 format, compatible with AR viewers.</p>
        </footer>
      </div>
    </div>
  );
};

// --- Helper Component for Custom Model Uploads ---

interface CustomModelUploaderProps {
    type: 'tree' | 'rock' | 'grass';
    modelData?: CustomModelData;
    onChange: (type: 'tree' | 'rock' | 'grass', fileType: 'obj' | 'mtl' | 'glb', file: File | null) => void;
    onClear: (type: 'tree' | 'rock' | 'grass') => void;
}

const CustomModelUploader: React.FC<CustomModelUploaderProps> = ({ type, modelData, onChange, onClear }) => {
    const objInputRef = useRef<HTMLInputElement>(null);
    const mtlInputRef = useRef<HTMLInputElement>(null);
    const glbInputRef = useRef<HTMLInputElement>(null);

    const hasModel = modelData?.objFileName || modelData?.glbFileName;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold capitalize">{type} Model</h3>
                {hasModel && (
                    <button onClick={() => onClear(type)} className="text-gray-400 hover:text-red-400 transition-colors" aria-label={`Clear ${type} model`}>
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            <div className="space-y-3">
                {/* OBJ Uploader */}
                <div>
                    <input
                        type="file"
                        accept=".obj"
                        ref={objInputRef}
                        onChange={(e) => onChange(type, 'obj', e.target.files?.[0] || null)}
                        className="hidden"
                    />
                    <button
                        onClick={() => objInputRef.current?.click()}
                        className="w-full flex items-center bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm font-semibold px-3 py-2 rounded-md transition-colors"
                    >
                        <FolderOpenIcon className="w-5 h-5 mr-3 text-cyan-400" />
                        <span className="flex-grow text-left truncate">
                            {modelData?.objFileName || 'Upload .obj file'}
                        </span>
                    </button>
                </div>
                {/* MTL Uploader */}
                <div>
                    <input
                        type="file"
                        accept=".mtl"
                        ref={mtlInputRef}
                        onChange={(e) => onChange(type, 'mtl', e.target.files?.[0] || null)}
                        className="hidden"
                    />
                    <button
                        onClick={() => mtlInputRef.current?.click()}
                        className="w-full flex items-center bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm font-semibold px-3 py-2 rounded-md transition-colors"
                    >
                        <FolderOpenIcon className="w-5 h-5 mr-3 text-cyan-400" />
                        <span className="flex-grow text-left truncate">
                            {modelData?.mtlFileName || 'Upload .mtl file (optional)'}
                        </span>
                    </button>
                </div>

                <div className="relative flex items-center py-1">
                    <hr className="w-full border-t border-gray-600" />
                    <span className="absolute left-1/2 -translate-x-1/2 bg-gray-700/50 px-2 text-xs text-gray-400">OR</span>
                </div>

                {/* GLB Uploader */}
                <div>
                    <input
                        type="file"
                        accept=".glb"
                        ref={glbInputRef}
                        onChange={(e) => onChange(type, 'glb', e.target.files?.[0] || null)}
                        className="hidden"
                    />
                    <button
                        onClick={() => glbInputRef.current?.click()}
                        className="w-full flex items-center bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm font-semibold px-3 py-2 rounded-md transition-colors"
                    >
                        <FolderOpenIcon className="w-5 h-5 mr-3 text-teal-400" />
                        <span className="flex-grow text-left truncate">
                            {modelData?.glbFileName || 'Upload .glb file'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};


export default App;
