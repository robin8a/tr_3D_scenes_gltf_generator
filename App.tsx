import React, { useState, useCallback, useRef } from 'react';
import { buildGltf } from './utils/gltfBuilder';
import { parseGeoJsonToShapes } from './utils/geojsonParser';
import { DownloadIcon, UploadIcon } from './components/icons';

const App: React.FC = () => {
  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.geojson') && !file.name.toLowerCase().endsWith('.json')) {
        setError('Invalid file type. Please upload a GeoJSON (.geojson, .json) file.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setSceneUrl(null);

    // Use a timeout to allow the UI to update to the loading state
    setTimeout(async () => {
        try {
            const geojsonText = await file.text();
            const shapes = await parseGeoJsonToShapes(geojsonText);
            
            if (shapes.length === 0) {
                throw new Error("The GeoJSON file did not result in any visible 3D objects.");
            }

            const gltfJsonString = buildGltf(shapes);
            const blob = new Blob([gltfJsonString], { type: 'model/gltf+json' });
            const url = URL.createObjectURL(blob);
            
            // Clean up previous URL if it exists
            if (sceneUrl) {
                URL.revokeObjectURL(sceneUrl);
            }
            setSceneUrl(url);

        } catch (err) {
            console.error("Failed to process GeoJSON file:", err);
            const message = err instanceof Error ? err.message : String(err);
            setError(`An error occurred: ${message}`);
            if (sceneUrl) {
                URL.revokeObjectURL(sceneUrl);
                setSceneUrl(null);
            }
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, 50);
  }, [sceneUrl]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl text-center">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500 mb-4">
            GeoJSON to 3D Scene Generator
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            Upload a GeoJSON blueprint to generate a 3D scene ready for AR.
          </p>

          <div className="my-8 border-t border-gray-700"></div>
          
          <div className="flex flex-col items-center space-y-4">
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
                className="w-full max-w-sm bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center"
            >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
                <>
                 <UploadIcon className="w-5 h-5 mr-2" />
                 Upload GeoJSON File
                </>
            )}
          </button>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 animate-fade-in">
                <p><strong>Error:</strong> {error}</p>
            </div>
          )}

          {sceneUrl && (
            <div className="mt-8 p-4 bg-gray-700/50 border border-green-500/30 rounded-lg animate-fade-in">
              <p className="text-green-400 mb-4">Your scene has been generated successfully!</p>
              
              <div className="w-full h-96 md:h-[500px] bg-gray-800/50 rounded-md mb-6 border border-gray-600">
                <model-viewer
                  src={sceneUrl}
                  alt="Generated 3D scene from GeoJSON"
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  camera-controls
                  auto-rotate
                  shadow-intensity="1"
                  style={{ width: '100%', height: '100%', '--poster-color': 'transparent' }}
                ></model-viewer>
              </div>
              
              <a
                href={sceneUrl}
                download="scene.gltf"
                className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download scene.gltf
              </a>
            </div>
          )}

           <footer className="mt-12 text-sm text-gray-500">
            <p>Generated files are in glTF 2.0 format, compatible with AR viewers.</p>
           </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
