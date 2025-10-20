
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createCube, createPyramid, createSphere, Geometry } from './utils/geometry';
import { buildGltf, type Shape } from './utils/gltfBuilder';
import { parseObj } from './utils/objParser';
import { parsePly } from './utils/plyParser';
import { DownloadIcon, UploadIcon, CloseIcon } from './components/icons';

const App: React.FC = () => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedGeometry, setUploadedGeometry] = useState<Geometry | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [fileNames, setFileNames] = useState<string[] | null>(null);
  const [parseMessage, setParseMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    
    if (uploadedGeometry) {
      try {
        // Generate a GLTF containing only the uploaded model for preview
        const shapes: Shape[] = [{
          geometry: uploadedGeometry,
          translation: [0, 0, 0],
          color: (uploadedGeometry.colors && uploadedGeometry.colors.length > 0) ? undefined : [0.75, 0.75, 0.75, 1.0],
        }];
        const gltfJsonString = buildGltf(shapes);
        const blob = new Blob([gltfJsonString], { type: 'model/gltf+json' });
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setDownloadUrl(null); // Clear previous full scene when new file is uploaded
      } catch (error) {
        console.error("Failed to generate preview:", error);
        alert("Could not generate a preview for the uploaded model.");
        setPreviewUrl(null);
      }
    } else {
        setPreviewUrl(null);
    }
    
    // Cleanup function to revoke the object URL and prevent memory leaks
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [uploadedGeometry]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsParsing(true);
    setFileNames(Array.from(files).map(f => f.name));
    setUploadedGeometry(null);
    setDownloadUrl(null);
    setParseMessage('');

    try {
      const fileList = Array.from(files);
      const objFile = fileList.find(f => f.name.toLowerCase().endsWith('.obj'));
      const mtlFile = fileList.find(f => f.name.toLowerCase().endsWith('.mtl'));
      const plyFile = fileList.find(f => f.name.toLowerCase().endsWith('.ply'));

      // --- Validation ---
      if (fileList.length > 2) throw new Error("Please select a maximum of two files.");
      if (plyFile && fileList.length > 1) throw new Error(".ply files cannot be paired with other files.");
      if (mtlFile && !objFile) throw new Error("A .mtl file must be selected with a .obj file.");
      if (!plyFile && !objFile) throw new Error("You must select a .obj or .ply model file.");
      if (plyFile && objFile) throw new Error("Please select either a .ply or a .obj file, not both.");

      let geometry: Geometry;

      if (plyFile) {
        const text = await plyFile.text();
        geometry = parsePly(text);
      } else if (objFile) {
        const objText = await objFile.text();
        const mtlText = mtlFile ? await mtlFile.text() : undefined;
        geometry = parseObj(objText, mtlText);
      } else {
        throw new Error("No valid model file found.");
      }

      if (geometry.positions.length === 0) {
        throw new Error("Parsed geometry is empty. The file might be invalid or unsupported.");
      }

      if (geometry.colors && geometry.colors.length > 0) {
         const message = mtlFile 
            ? "Success! Model and material colors were loaded."
            : "Success! Vertex colors were found and will be used.";
        setParseMessage(message);
      } else {
        setParseMessage("Model parsed. No colors found; a default color will be applied.");
      }
      setUploadedGeometry(geometry);

    } catch (error) {
      console.error("Failed to parse file(s):", error);
      alert(`An error occurred while parsing the file(s): ${error instanceof Error ? error.message : String(error)}`);
      setFileNames(null);
      setParseMessage('');
    } finally {
      setIsParsing(false);
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
    setFileNames(null);
    setDownloadUrl(null);
    setParseMessage('');
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

        const shapes: Shape[] = [
          { geometry: cube, translation: [-2, 0.5, 0], color: [0.8, 0.2, 0.2, 1.0] }, // Red Cube
          { geometry: pyramid, translation: [0, 0.5, 0], color: [0.2, 0.8, 0.2, 1.0] }, // Green Pyramid
          { geometry: sphere, translation: [2, 0.75, 0], color: [0.2, 0.2, 0.8, 1.0] }, // Blue Sphere
        ];

        if (uploadedGeometry) {
          shapes.push({
            geometry: uploadedGeometry,
            translation: [0, 1, -4],
            // Only apply the default color if the geometry doesn't have its own vertex colors.
            color: (uploadedGeometry.colors && uploadedGeometry.colors.length > 0) ? undefined : [0.75, 0.75, 0.75, 1.0], 
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
            Create a <code className="bg-gray-700 text-purple-300 px-2 py-1 rounded">.gltf</code> file with primitives, or upload model files to add to the scene.
          </p>

          <div className="my-8 border-t border-gray-700"></div>

          <div className="space-y-4 flex flex-col items-center">
            <h2 className="text-xl font-semibold text-gray-300">Add Your Own Model</h2>
            <input
              type="file"
              accept=".obj,.ply,.mtl"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={isParsing}
              multiple
            />
            
            {!fileNames ? (
              <button
                onClick={handleUploadClick}
                className="w-full max-w-sm border-2 border-dashed border-gray-600 hover:border-purple-500 hover:bg-gray-700/50 text-gray-300 font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
              >
                <UploadIcon className="w-5 h-5 mr-2" />
                Select Files (.obj/.ply, +.mtl)
              </button>
            ) : (
              <div className="w-full max-w-sm">
                  <div className="mx-auto flex items-center justify-between bg-gray-700 text-gray-200 p-3 rounded-lg">
                    <span className="truncate mr-2">{fileNames.join(', ')}</span>
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
                  {parseMessage && (
                    <p className={`mt-2 text-sm ${parseMessage.startsWith("Success") ? 'text-green-400' : 'text-gray-400'}`}>
                      {parseMessage}
                    </p>
                  )}
              </div>
            )}
          </div>
          
          {previewUrl && !downloadUrl && (
            <div className="mt-8 p-4 bg-gray-700/50 border border-purple-500/30 rounded-lg animate-fade-in">
              <p className="text-purple-300 mb-4">Previewing your uploaded model. Original colors are shown if found in the file.</p>
              
              <div className="w-full h-96 md:h-[500px] bg-gray-800/50 rounded-md mb-2 border border-gray-600">
                <model-viewer
                  src={previewUrl}
                  alt="Preview of the uploaded 3D model"
                  camera-controls
                  auto-rotate
                  shadow-intensity="1"
                  style={{ width: '100%', height: '100%', '--poster-color': 'transparent' }}
                ></model-viewer>
              </div>
            </div>
          )}

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
              'Generate & Preview Full Scene'
            )}
          </button>

          {downloadUrl && (
            <div className="mt-8 p-4 bg-gray-700/50 border border-green-500/30 rounded-lg animate-fade-in">
              <p className="text-green-400 mb-4">Your full scene is ready! Interact with the preview below.</p>
              
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
