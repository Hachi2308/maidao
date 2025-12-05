
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Controls from './components/Controls';
import Gallery from './components/Gallery';
import ImageModal from './components/ImageModal';
import LogConsole, { LogEntry } from './components/LogConsole';
import { AspectRatio, GenerationConfig, GeneratedImage, GeminiModel, BackgroundColor, ImageStyle, Resolution, ColorPalette } from './types';
import { generateSingleImage } from './services/geminiService';
import { initGapi, initGis, requestAccessToken, createDriveFolder, uploadFileToDrive } from './services/driveService';
import { saveImageToDB, getImagesFromDB, deleteImageFromDB, clearImagesFromDB } from './services/storageService';
import JSZip from 'jszip';

// Helper for rate limiting/delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Convert Data URI to Blob for reliable downloads
const dataURItoBlob = (dataURI: string) => {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

// Helper: Create safe filename from prompt
const getSafeFilename = (prompt: string, resolution: string, angle: string, id: string | number) => {
    // Take first 6 words
    const shortPrompt = prompt 
        ? prompt.split(' ').slice(0, 6).join(' ')
        : 'sony-macro';
    
    // Cleanup: remove special chars, lowercase, replace spaces with dashes
    const slug = shortPrompt
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();
    
    const safeAngle = angle.replace(/\s+/g, '-').toLowerCase();
    return `${slug}-${safeAngle}-${resolution}-${id}.png`;
};

// Helper: Remove Green Background for transparency
// IMPROVED ALGORITHM: Uses relative color difference to handle lighting variations
const processGreenScreen = (base64Data: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64Data); return; }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Robust Chroma Key Algorithm
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // If Green is dominantly stronger than Red and Blue, it is green screen.
                if (g > r + 40 && g > b + 40) {
                    data[i + 3] = 0; // Set Alpha to 0
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64Data);
        img.src = base64Data;
    });
};

const DEFAULT_CONFIG: GenerationConfig = {
    apiKey: '',
    model: 'gemini-2.5-flash-image', 
    prompt: '',
    style: 'realistic',
    aspectRatio: AspectRatio.SQUARE,
    background: 'black',
    resolution: '1k',
    includeLeft: true,
    includeRight: true,
    includeTop: true,
    includeFront: true, 
    includeIsometric: true, 
    batchCount: 1, 
    useBorder: false,
    selectedPaletteId: null,
};

const DEFAULT_PALETTES: ColorPalette[] = [
    { id: 'wc-1', name: 'Pastel Dream', colors: ['#FFB7B2', '#E2F0CB', '#B5EAD7', '#C7CEEA'] },
    { id: 'wc-2', name: 'Ocean Mist', colors: ['#A0E7E5', '#B4F8C8', '#FBE7C6', '#FFAEBC'] },
    { id: 'wc-3', name: 'Sunset Wash', colors: ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB'] },
    { id: 'wc-4', name: 'Earthy Clay', colors: ['#D7A86E', '#A47551', '#754C29', '#523A28'] },
    { id: 'wc-5', name: 'Cool Blues', colors: ['#BFD7ED', '#60A3D9', '#0074B7', '#003B73'] },
    { id: 'wc-6', name: 'Neon Pop', colors: ['#FF00FF', '#00FFFF', '#FFFF00', '#000000'] },
    { id: 'wc-7', name: 'Vintage', colors: ['#CB997E', '#DDBEA9', '#FFE8D6', '#B7B7A4'] },
    { id: 'wc-8', name: 'Forest', colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D'] },
    { id: 'wc-9', name: 'Lavender', colors: ['#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8'] },
    { id: 'wc-10', name: 'Citrus', colors: ['#F94144', '#F3722C', '#F8961E', '#F9C74F'] },
];

const App: React.FC = () => {
  // --- CONFIG STATE WITH PERSISTENCE ---
  const [config, setConfig] = useState<GenerationConfig>(() => {
      try {
          const saved = localStorage.getItem('sony_macro_config');
          return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
      } catch {
          return DEFAULT_CONFIG;
      }
  });

  // Custom Palettes State
  const [customPalettes, setCustomPalettes] = useState<ColorPalette[]>(() => {
      try {
          const saved = localStorage.getItem('sony_macro_palettes');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  // Combine defaults and custom
  const allPalettes = [...DEFAULT_PALETTES, ...customPalettes];

  // Save config on change
  useEffect(() => {
      localStorage.setItem('sony_macro_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
      localStorage.setItem('sony_macro_palettes', JSON.stringify(customPalettes));
  }, [customPalettes]);

  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem('google_client_id') || '';
  });
  
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isConnectingKey, setIsConnectingKey] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('google_client_id', googleClientId);
  }, [googleClientId]);

  // --- STANDARD STATE ---
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load images from IndexedDB on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        const storedImages = await getImagesFromDB();
        setImages(storedImages);
      } catch (e) {
        console.error("Failed to load history from DB", e);
      }
    };
    loadImages();
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [batchPrompts, setBatchPrompts] = useState<string[]>([]);
  
  const stopGenerationRef = useRef<boolean>(false);
  const [activeTab, setActiveTab] = useState<'gallery' | 'logs'>('gallery');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState('');

  // Init Google Scripts & API Key Check
  useEffect(() => {
     initGapi();
     checkApiKey();
  }, []);

  // Update hasApiKey when config.apiKey changes
  useEffect(() => {
    if (config.apiKey && config.apiKey.length > 10) {
        setHasApiKey(true);
    }
  }, [config.apiKey]);

  const checkApiKey = async () => {
    try {
        if (config.apiKey && config.apiKey.length > 10) {
            setHasApiKey(true);
            return;
        }

        const aiStudio = (window as any).aistudio;
        if (aiStudio) {
            const has = await aiStudio.hasSelectedApiKey();
            setHasApiKey(has);
        } else if (process.env.API_KEY) {
            // Fallback: if env key is present, assume we can proceed
            setHasApiKey(true);
        }
    } catch(e) {
        console.error("Check key error", e);
    }
  };

  const handleConnectKey = async () => {
      if (config.apiKey && config.apiKey.length > 10) {
          setHasApiKey(true);
          return;
      }

      setIsConnectingKey(true);
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
          try {
              await aiStudio.openSelectKey();
          } catch (e) {
              console.error("Key selection failed or cancelled", e);
          }
          // Per instructions: assume success after trigger to avoid race conditions
          setHasApiKey(true);
      } else {
          console.warn("AI Studio interface not found. Proceeding with potential env key.");
          setHasApiKey(true);
      }
      setIsConnectingKey(false);
  };

  useEffect(() => {
    if (googleClientId) initGis(googleClientId);
  }, [googleClientId]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [{ timestamp: new Date().toLocaleTimeString(), message, type }, ...prev]);
  };

  const handleStop = () => {
    stopGenerationRef.current = true;
    addLog("Stopping generation sequence...", 'warning');
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        return newSet;
    });
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === images.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(images.map(img => img.id)));
  };

  // Color Extraction Logic
  const extractColorsFromImage = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              
              // Scale down for faster processing
              canvas.width = 100;
              canvas.height = 100;
              ctx.drawImage(img, 0, 0, 100, 100);
              const data = ctx.getImageData(0, 0, 100, 100).data;
              const colorCounts: {[key: string]: number} = {};
              
              for(let i=0; i<data.length; i+=40) { // Sample every 10th pixel
                  const r = data[i];
                  const g = data[i+1];
                  const b = data[i+2];
                  // Simple Hex conversion
                  const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                  colorCounts[hex] = (colorCounts[hex] || 0) + 1;
              }

              // Sort by frequency and take top 5
              const sortedColors = Object.entries(colorCounts)
                  .sort((a,b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(entry => entry[0]);
              
              const newPalette: ColorPalette = {
                  id: `custom-${Date.now()}`,
                  name: `Custom Palette ${customPalettes.length + 1}`,
                  colors: sortedColors,
                  isCustom: true
              };

              setCustomPalettes(prev => [...prev, newPalette]);
              addLog(`Extracted palette with ${sortedColors.length} colors.`, 'success');
          };
          img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
  };

  const handleDeletePalette = (id: string) => {
      setCustomPalettes(prev => prev.filter(p => p.id !== id));
      if (config.selectedPaletteId === id) setConfig(prev => ({...prev, selectedPaletteId: null}));
  };

  const runConcurrentTasks = async <T,>(tasks: (() => Promise<T>)[], concurrency: number) => {
      const executing: Promise<void>[] = [];
      for (const task of tasks) {
          if (stopGenerationRef.current) break;
          const p = Promise.resolve().then(() => task());
          const e: Promise<void> = p.then(() => { executing.splice(executing.indexOf(e), 1); }).catch(() => { executing.splice(executing.indexOf(e), 1); });
          executing.push(e);
          if (executing.length >= concurrency) await Promise.race(executing);
      }
      return Promise.all(executing);
  };

  const generateImageSafe = async (
    prompt: string,
    aspectRatio: AspectRatio,
    angle: string,
    seed: number,
    background: BackgroundColor,
    style: ImageStyle,
    resolution: Resolution,
    referenceImage?: string,
    isEditing: boolean = false
  ): Promise<{ content: string; usedModel: string } | null> => {
    // Model selection is now handled inside geminiService based on config.model and resolution
    try {
      addLog(isEditing ? `Editing/Scaling...` : `Generating [${angle}]...`, 'info');
      
      const selectedPalette = allPalettes.find(p => p.id === config.selectedPaletteId) || null;

      const result = await generateSingleImage(
          config.model, prompt, aspectRatio, angle, seed, background, style, resolution, config.apiKey, referenceImage, isEditing, config.useBorder, selectedPalette
      );
      
      if (result) {
        let finalUrl = result.url;
        return { content: finalUrl, usedModel: result.usedModel };
      }
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      addLog(`Generation failed: ${errorMsg}`, 'error');
      if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("403") || errorMsg.includes("No API Key provided")) {
          // Only force logout if we aren't using a manual key, OR if the manual key itself is bad
          if (!config.apiKey) {
            setHasApiKey(false);
            setError("Permission denied. Select valid API Key.");
            if ((window as any).aistudio) await (window as any).aistudio.openSelectKey();
            setHasApiKey(true);
          } else {
             setError("API Key Error. Check your manual key in settings.");
          }
      }
    }
    return null;
  };

  const addImage = async (newImage: GeneratedImage) => {
      await saveImageToDB(newImage);
      setImages(prev => [newImage, ...prev]);
  };

  const handleGenerate = async () => {
    if (!hasApiKey && !config.apiKey) { await handleConnectKey(); return; }

    setIsGenerating(true);
    stopGenerationRef.current = false;
    setError(null);

    // MODE 1: BATCH EDIT / UPSCALE
    if (selectedIds.size > 0) {
        const targets = images.filter(img => selectedIds.has(img.id));
        const editPrompt = config.prompt.trim();
        // Allow upscale without prompt
        if (!editPrompt && !activeTab) { /* Just passing through for structure */ }

        addLog(`Batch Edit: ${targets.length} images.`, 'info');
        const tasks = targets.map((targetImg) => async () => {
            if (stopGenerationRef.current) return;
            const seed = Math.floor(Math.random() * 1000000000);
            const result = await generateImageSafe(
                editPrompt || targetImg.prompt, config.aspectRatio, targetImg.angle, seed, config.background, config.style, targetImg.resolution, targetImg.url, true
            );
            if (result) {
                await addImage({
                    id: Math.random().toString(36).substring(7),
                    url: result.content,
                    angle: targetImg.angle,
                    prompt: editPrompt || targetImg.prompt,
                    timestamp: Date.now(),
                    resolution: config.resolution
                });
            }
        });
        await runConcurrentTasks(tasks, 5);
        setSelectedIds(new Set()); 
        addLog("Batch Edit Finished.", 'success');
        setIsGenerating(false);
        return;
    }

    // MODE 2: NEW GENERATION (Flattened for Multi-threading)
    const promptsToProcess = batchPrompts.length > 0 ? batchPrompts : (config.prompt.trim() ? [config.prompt] : []);
    if (promptsToProcess.length === 0) { setIsGenerating(false); return; }
    
    const anglesToGenerate: string[] = [];
    if (config.includeFront) anglesToGenerate.push('Front');
    if (config.includeLeft) anglesToGenerate.push('Left Side');
    if (config.includeRight) anglesToGenerate.push('Right Side');
    if (config.includeTop) anglesToGenerate.push('Top-down');
    if (config.includeIsometric) anglesToGenerate.push('Isometric');
    if (anglesToGenerate.length === 0) { setError("Select at least one angle."); setIsGenerating(false); return; }

    try {
        const allTasks: (() => Promise<void>)[] = [];

        // BUILD ALL TASKS FIRST to allow global concurrency
        for (const currentPrompt of promptsToProcess) {
            for (let i = 0; i < config.batchCount; i++) {
                
                // Case A: Reference Image Exists (Uploaded)
                if (uploadedImage) {
                    for (const angle of anglesToGenerate) {
                        allTasks.push(async () => {
                            if (stopGenerationRef.current) return;
                            const sessionSeed = Math.floor(Math.random() * 1000000000);
                            const resultObj = await generateImageSafe(
                                currentPrompt, config.aspectRatio, angle, sessionSeed, config.background, config.style, config.resolution, uploadedImage
                            );
                            if (resultObj) await addImage({ 
                                id: Math.random().toString(36).substring(7), 
                                url: resultObj.content, 
                                angle, 
                                prompt: currentPrompt, 
                                timestamp: Date.now(), 
                                resolution: config.resolution 
                            });
                        });
                    }
                } 
                // Case B: Text to Image
                else {
                    allTasks.push(async () => {
                         if (stopGenerationRef.current) return;
                         const sessionSeed = Math.floor(Math.random() * 1000000000); 
                         const anchorAngle = anglesToGenerate[0];
                         let referenceImage: string | undefined = undefined;

                         try {
                            const anchorResult = await generateImageSafe(
                                currentPrompt, config.aspectRatio, anchorAngle, sessionSeed, config.background, config.style, config.resolution
                            );
                            if (anchorResult) {
                                referenceImage = anchorResult.content; 
                                await addImage({ 
                                    id: Math.random().toString(36).substring(7), 
                                    url: anchorResult.content, 
                                    angle: anchorAngle, 
                                    prompt: currentPrompt, 
                                    timestamp: Date.now(), 
                                    resolution: config.resolution 
                                });
                            } else { return; }
                         } catch (e) { return; }

                         if (stopGenerationRef.current) return;

                         if (referenceImage && anglesToGenerate.length > 1) {
                             const remainingAngles = anglesToGenerate.slice(1);
                             for (const angle of remainingAngles) {
                                 if (stopGenerationRef.current) return;
                                 const derivedResult = await generateImageSafe(
                                      currentPrompt, config.aspectRatio, angle, sessionSeed, config.background, config.style, config.resolution, referenceImage 
                                  );
                                  if (derivedResult) await addImage({ 
                                      id: Math.random().toString(36).substring(7), 
                                      url: derivedResult.content, 
                                      angle, 
                                      prompt: currentPrompt, 
                                      timestamp: Date.now(), 
                                      resolution: config.resolution 
                                  });
                             }
                         }
                    });
                }
            }
        }

        if (allTasks.length > 0) {
            addLog(`Queueing ${allTasks.length} tasks (5 threads)...`, 'info');
            await runConcurrentTasks(allTasks, 5);
        }

    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
      stopGenerationRef.current = false;
      addLog("Finished.", 'info');
    }
  };

  const handleEditImage = async (originalImage: GeneratedImage, newPrompt: string) => {
      if (!hasApiKey && !config.apiKey) { await handleConnectKey(); return; }
      setIsGenerating(true);
      try {
        const seed = Math.floor(Math.random() * 1000000000);
        const result = await generateImageSafe(
            newPrompt, config.aspectRatio, originalImage.angle, seed, config.background, config.style, originalImage.resolution, originalImage.url, true
        );
        if (result) {
            await addImage({
                id: Math.random().toString(36).substring(7),
                url: result.content,
                angle: originalImage.angle,
                prompt: newPrompt,
                timestamp: Date.now(),
                resolution: originalImage.resolution
            });
            setSelectedImage(null); 
        }
      } catch (e: any) { } finally { setIsGenerating(false); }
  };

  const handleBatchUpscale = async (targetResolution: Resolution) => {
      if (!hasApiKey && !config.apiKey) { await handleConnectKey(); return; }
      if (selectedIds.size === 0) return;

      setIsGenerating(true);
      stopGenerationRef.current = false;
      addLog(`Upscaling ${selectedIds.size} images to ${targetResolution}...`, 'info');
      
      const targets = images.filter(img => selectedIds.has(img.id));
      const tasks = targets.map((targetImg) => async () => {
          if (stopGenerationRef.current) return;
          const seed = Math.floor(Math.random() * 1000000000);
          
          // Use original prompt, but force new resolution and set isEditing to true (re-generation based on ref)
          const result = await generateImageSafe(
              targetImg.prompt, 
              config.aspectRatio, 
              targetImg.angle, 
              seed, 
              config.background, 
              config.style, 
              targetResolution, // Force New Resolution
              targetImg.url, 
              true // isEditing = true ensures it sticks to the reference composition
          );
          
          if (result) {
              await addImage({
                  id: Math.random().toString(36).substring(7),
                  url: result.content,
                  angle: targetImg.angle,
                  prompt: targetImg.prompt,
                  timestamp: Date.now(),
                  resolution: targetResolution
              });
          }
      });

      await runConcurrentTasks(tasks, 5);
      setSelectedIds(new Set());
      addLog("Batch Upscale Finished.", 'success');
      setIsGenerating(false);
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    addLog(`Zipping ${images.length} images...`, 'info');
    try {
        const zip = new JSZip();
        const folder = zip.folder("sony-macro-collection");
        if (folder) {
            images.forEach((img, index) => {
                const blob = dataURItoBlob(img.url);
                // Use safe prompt summary for filename
                const fileName = getSafeFilename(img.prompt, img.resolution, img.angle, index);
                folder.file(fileName, blob);
            });
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `sony-macro-archive-${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1000);
        }
    } catch (e: any) { addLog(`ZIP failed: ${e.message}`, 'error'); }
  };

  const handleClearHistory = async () => {
      await clearImagesFromDB();
      setImages([]);
      setSelectedIds(new Set());
      addLog("History cleared.", 'warning');
  };

  const handleDeleteImage = async (id: string) => {
    await deleteImageFromDB(id);
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSaveToDrive = async () => {
    if (!googleClientId) { setError("Missing Client ID"); return; }
    try {
      setIsSavingToDrive(true);
      setDriveStatus('Auth...');
      const accessToken = await requestAccessToken();
      setDriveStatus('Folder...');
      const folderId = await createDriveFolder(`Sony Macro AI - ${new Date().toLocaleString()}`, accessToken);
      let completed = 0;
      for (const img of images) {
         const safeName = getSafeFilename(img.prompt, img.resolution, img.angle, img.id);
         await uploadFileToDrive(img.url, safeName, folderId, accessToken);
         completed++;
         setDriveStatus(`${completed}/${images.length}`);
      }
      setDriveStatus('Done!');
    } catch (err: any) { setError(`Drive Error: ${err.message}`); } finally { setIsSavingToDrive(false); }
  };

  if (!hasApiKey) {
      return (
          <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sony-black via-black to-sony-dark z-0"></div>
              
              <div className="z-10 text-center space-y-6 max-w-lg w-full bg-gray-900/50 p-8 rounded-2xl border border-gray-800 backdrop-blur-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-sony-accent to-red-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-900/30 mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight">Sony Macro AI Studio</h1>
                <p className="text-gray-400 text-sm">
                    Connect your Gemini API Key to unlock professional-grade macro photography generation.
                </p>

                <button 
                    onClick={handleConnectKey} 
                    disabled={isConnectingKey}
                    className="w-full py-4 bg-gradient-to-r from-sony-accent to-orange-600 rounded-xl font-bold text-white shadow-lg hover:shadow-orange-900/50 transition-all flex items-center justify-center space-x-2"
                >
                    {isConnectingKey ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Connecting...</span>
                        </>
                    ) : (
                        <span>Connect API Key</span>
                    )}
                </button>
                <p className="text-xs text-gray-600 mt-4">Powered by Google Gemini 2.5 Flash</p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-sony-accent selection:text-white">
      <Header />
      <main className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-80px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
           <div className="lg:col-span-4 xl:col-span-3 h-full flex flex-col min-h-0">
              <Controls 
                config={config} setConfig={setConfig} onGenerate={handleGenerate} onStop={handleStop}
                isGenerating={isGenerating} googleClientId={googleClientId} setGoogleClientId={setGoogleClientId}
                uploadedImage={uploadedImage} setUploadedImage={setUploadedImage}
                batchPrompts={batchPrompts} setBatchPrompts={setBatchPrompts} selectedCount={selectedIds.size}
                palettes={allPalettes}
                onDeletePalette={handleDeletePalette}
                onCreatePalette={extractColorsFromImage}
                onBatchUpscale={handleBatchUpscale}
              />
              {error && <div className="mt-2 p-2 bg-red-900/50 text-red-200 text-xs rounded text-center">{error}</div>}
           </div>

           <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full overflow-hidden">
             <div className="flex items-center space-x-1 mb-4 border-b border-gray-800 shrink-0">
                <button onClick={() => setActiveTab('gallery')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'gallery' ? 'border-sony-accent text-white' : 'border-transparent text-gray-400'}`}>Gallery ({images.length})</button>
                <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'logs' ? 'border-sony-accent text-white' : 'border-transparent text-gray-400'}`}>Logs ({logs.length})</button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'gallery' ? (
                <Gallery 
                    images={images} onImageClick={setSelectedImage} onDownloadAll={handleDownloadAll}
                    onClearHistory={handleClearHistory} onSaveToDrive={handleSaveToDrive}
                    isSavingToDrive={isSavingToDrive} driveStatus={driveStatus}
                    onDeleteImage={handleDeleteImage} selectedIds={selectedIds}
                    onToggleSelect={toggleSelection} onToggleSelectAll={toggleSelectAll}
                />
                ) : (
                <LogConsole logs={logs} onClear={() => setLogs([])} />
                )}
             </div>
           </div>
        </div>
      </main>

      <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} onEdit={handleEditImage} isGenerating={isGenerating} />
    </div>
  );
};

export default App;
