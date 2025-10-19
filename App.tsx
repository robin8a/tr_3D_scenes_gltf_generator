
import React, { useState, useCallback, useRef } from 'react';
import { createCube, createPyramid, createSphere, createTree, Geometry } from './utils/geometry';
import { buildGltf, type Shape } from './utils/gltfBuilder';
import { parseObj } from './utils/objParser';
import { DownloadIcon, UploadIcon, CloseIcon } from './components/icons';

const App: React.FC = () => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedGeometry, setUploadedGeometry] = useState<Geometry | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setFileName(file.name);
    setUploadedGeometry(null);
    setDownloadUrl(null);

    try {
      const text = await file.text();
      const geometry = parseObj(text);
      if (geometry.positions.length === 0) {
        throw new Error("Parsed geometry is empty. The .obj file might be invalid or unsupported.");
      }
      setUploadedGeometry(geometry);
    } catch (error) {
      console.error("Failed to parse .obj file:", error);
      alert(`An error occurred while parsing the .obj file: ${error instanceof Error ? error.message : String(error)}`);
      setFileName(null);
    } finally {
      setIsParsing(false);
      // Reset the input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setUploadedGeometry(null);
    setFileName(null);
    setDownloadUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleGenerateScene = useCallback(() => {
    setIsLoading(true);
    setDownloadUrl(null);

    setTimeout(() => {
      try {
        const cube = createCube();
        const pyramid = createPyramid();
        const sphere = createSphere(0.75, 32, 16);
        const { trunk, canopy } = createTree();

        // FIX: Explicitly type `shapes` as `Shape[]` to resolve type inference issues with `color` and `translation` properties.
        const shapes: Shape[] = [
          { geometry: cube, translation: [-3, 0.5, 0], color: [0.8, 0.2, 0.2, 1.0] }, // Red
          { geometry: pyramid, translation: [-1, 0.5, 0], color: [0.2, 0.8, 0.2, 1.0] }, // Green
          { geometry: trunk, translation: [1, 0.5, 0], color: [0.54, 0.27, 0.07, 1.0] }, // Brown
          { geometry: canopy, translation: [1, 1.5, 0], color: [0.0, 0.5, 0.1, 1.0] }, // Dark Green
          { geometry: sphere, translation: [3, 0.75, 0], color: [0.2, 0.2, 0.8, 1.0] }, // Blue
        ];

        if (uploadedGeometry) {
          shapes.push({
            geometry: uploadedGeometry,
            translation: [0, 1, -4],
            color: [0.75, 0.75, 0.75, 1.0], // Silver
          });
        }

        const gltfJsonString = buildGltf(shapes);

        const blob = new Blob([gltfJsonString], { type: 'model/gltf+json' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      } catch (error) {
        console.error("Failed to generate scene:", error);
        alert("An error occurred while generating the scene. Check the console for details.");
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [uploadedGeometry]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-3xl text-center">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-4">
            3D Scene Generator
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            Create a <code className="bg-gray-700 text-purple-300 px-2 py-1 rounded">.gltf</code> file with primitives, or upload a <code className="bg-gray-700 text-purple-300 px-2 py-1 rounded">.obj</code> file to add it to the scene.
          </p>

          <div className="my-8 border-t border-gray-700"></div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-300">Add Your Own Model</h2>
            <input
              type="file"
              accept=".obj"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={isParsing}
            />
            
            {!fileName ? (
              <button
                onClick={handleUploadClick}
                className="w-full max-w-sm border-2 border-dashed border-gray-600 hover:border-purple-500 hover:bg-gray-700/50 text-gray-300 font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
              >
                <UploadIcon className="w-5 h-5 mr-2" />
                Select .obj File
              </button>
            ) : (
              <div className="w-full max-w-sm mx-auto flex items-center justify-between bg-gray-700 text-gray-200 p-3 rounded-lg">
                <span className="truncate mr-2">{fileName}</span>
                 {isParsing ? (
                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                 ) : (
                  <button onClick={handleClearFile} className="ml-2 p-1 rounded-full hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" aria-label="Clear file">
                    <CloseIcon className="w-5 h-5" />
                  </button>
                 )}
              </div>
            )}
          </div>
          
           <div className="my-8 border-t border-gray-700"></div>

          <button
            onClick={handleGenerateScene}
            disabled={isLoading || isParsing}
            className="w-full max-w-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Scene...
              </>
            ) : (
              'Generate & Preview Scene'
            )}
          </button>

          {downloadUrl && (
            <div className="mt-8 p-4 bg-gray-700/50 border border-green-500/30 rounded-lg animate-fade-in">
              <p className="text-green-400 mb-4">Your scene is ready! Interact with the preview below.</p>
              
              <div className="w-full h-96 md:h-[500px] bg-gray-800/50 rounded-md mb-6 border border-gray-600">
                <model-viewer
                  src={downloadUrl}
                  alt="Generated 3D scene with various shapes"
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  camera-controls
                  auto-rotate
                  shadow-intensity="1"
                  style={{ width: '100%', height: '100%', '--poster-color': 'transparent' }}
                ></model-viewer>
              </div>
              
              <a
                href={downloadUrl}
                download="scene.gltf"
                className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download scene.gltf
              </a>
            </div>
          )}
           <footer className="mt-12 text-sm text-gray-500">
            <p>Generated files are in glTF 2.0 format.</p>
            <p>You can test the output file by dragging and dropping it into a viewer like <a href="https://gltf-viewer.donmccurdy.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">gltf-viewer.donmccurdy.com</a>.</p>
        </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
