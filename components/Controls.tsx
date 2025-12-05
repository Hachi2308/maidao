

import React, { useRef, useState } from 'react';
import { AspectRatio, GenerationConfig, BackgroundColor, ImageStyle, Resolution, ColorPalette } from '../types';

interface ControlsProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onGenerate: () => void;
  onStop?: () => void;
  isGenerating: boolean;
  googleClientId: string;
  setGoogleClientId: (id: string) => void;
  uploadedImage: string | null;
  setUploadedImage: (img: string | null) => void;
  batchPrompts: string[];
  setBatchPrompts: (prompts: string[]) => void;
  selectedCount?: number;
  palettes: ColorPalette[]; // New
  onDeletePalette: (id: string) => void; // New
  onCreatePalette: (file: File) => void; // New
  onBatchUpscale: (resolution: Resolution) => void; // New
}

const STYLE_OPTIONS: { id: ImageStyle; label: string; icon: string; desc: string }[] = [
  { id: 'realistic', label: 'Sony Alpha', icon: '📷', desc: 'Realistic Macro' },
  { id: 'pixar', label: 'Pixar 3D', icon: '🎬', desc: 'Animation Style' },
  { id: 'lego', label: 'Lego', icon: '🧱', desc: 'Plastic Bricks' },
  { id: 'claymation', label: '3D Clay', icon: '🏺', desc: 'Stop Motion / Clay' },
  { id: 'watercolor', label: 'Watercolor', icon: '🎨', desc: 'Artistic Paint' },
  { id: 'vector', label: 'Flat Vector', icon: '📐', desc: 'Illustration Design' },
  { id: 'neon', label: 'Neon Lines', icon: '⚡', desc: 'Glowing Light Lines' },
  { id: 'coloring-book', label: 'Coloring Book', icon: '🖍️', desc: 'Black & White Line Art' },
  { id: 'steampunk', label: 'Steampunk', icon: '⚙️', desc: 'Gears & Brass' },
  { id: 'oil-painting', label: 'Oil Paint', icon: '🖌️', desc: 'Textured Canvas' },
  { id: 'pop-art', label: 'Pop Art', icon: '💥', desc: 'Warhol Style' },
  { id: 'ukiyo-e', label: 'Ukiyo-e', icon: '🌊', desc: 'Japanese Woodblock' },
  { id: 'ghibli', label: 'Ghibli', icon: '🍃', desc: 'Japanese Anime' },
  { id: 'gta', label: 'GTA Art', icon: '🔫', desc: 'Vector Loading Screen' },
  { id: 'minecraft', label: 'Minecraft', icon: '🧊', desc: 'Voxel Cube Art' },
  { id: 'funko', label: 'Funko Pop', icon: '🤪', desc: 'Vinyl Toy' },
  { id: 'simpsons', label: 'Simpsons', icon: '🍩', desc: 'Flat Cartoon' },
  { id: 'retro-anime', label: '90s Anime', icon: '🌙', desc: 'Sailor Moon Style' },
  { id: 'barbie', label: 'Barbie', icon: '💅', desc: 'Pink Plastic' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🤖', desc: 'Neon Sci-Fi' },
];

const Controls: React.FC<ControlsProps> = ({ 
  config, 
  setConfig, 
  onGenerate, 
  onStop,
  isGenerating,
  googleClientId,
  setGoogleClientId,
  uploadedImage,
  setUploadedImage,
  batchPrompts,
  setBatchPrompts,
  selectedCount = 0,
  palettes,
  onDeletePalette,
  onCreatePalette,
  onBatchUpscale
}) => {
  const [controlTab, setControlTab] = useState<'studio' | 'settings'>('studio');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptFileInputRef = useRef<HTMLInputElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = <K extends keyof GenerationConfig>(key: K, value: GenerationConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaletteImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          onCreatePalette(file);
      }
      if (paletteInputRef.current) paletteInputRef.current.value = '';
  };

  const handlePromptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 2);
            if (lines.length > 0) {
                setBatchPrompts(lines);
                handleChange('prompt', lines[0]);
            }
        };
        reader.readAsText(file);
    }
    if (promptFileInputRef.current) promptFileInputRef.current.value = '';
  };

  const clearBatch = () => setBatchPrompts([]);
  const handleClearImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const promptPlaceholder = selectedCount > 0 
      ? `BATCH EDIT MODE: Enter instructions to apply to the ${selectedCount} selected images...`
      : (uploadedImage ? "Describe the object in your reference image..." : "e.g. A futuristic gaming mouse...");

  return (
    <div className="bg-sony-dark rounded-xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col h-full max-h-screen">
      
      {/* Controls Tabs */}
      <div className="flex border-b border-gray-800 bg-black shrink-0">
          <button
            onClick={() => setControlTab('studio')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                controlTab === 'studio' ? 'bg-sony-dark text-sony-accent border-b-2 border-sony-accent' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setControlTab('settings')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                controlTab === 'settings' ? 'bg-sony-dark text-sony-accent border-b-2 border-sony-accent' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Settings
          </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="p-4 space-y-4">
            {/* ==================== SETTINGS TAB ==================== */}
            {controlTab === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Color Palette Creator */}
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                        <h3 className="text-white font-semibold mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                            Create Palette from Image
                        </h3>
                        <div 
                            onClick={() => paletteInputRef.current?.click()}
                            className="w-full h-16 border-2 border-dashed border-gray-700 rounded-lg bg-black/50 hover:bg-gray-900/50 hover:border-pink-500 transition-all cursor-pointer flex flex-col items-center justify-center group"
                        >
                            <input type="file" ref={paletteInputRef} onChange={handlePaletteImageUpload} accept="image/*" className="hidden" />
                            <span className="text-xs text-gray-400 group-hover:text-pink-300">Upload Image to Extract Colors</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">Saved palettes will appear in the Studio tab.</p>
                    </div>

                    {/* Resolution Setting */}
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                        <h3 className="text-white font-semibold mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Default Resolution
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {(['1k', '2k', '4k'] as Resolution[]).map((res) => (
                                <button
                                    key={res}
                                    onClick={() => handleChange('resolution', res)}
                                    className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all ${
                                        config.resolution === res 
                                        ? 'bg-purple-900/40 border-purple-500 text-white ring-1 ring-purple-500' 
                                        : 'bg-black border-gray-700 text-gray-400 hover:border-gray-500'
                                    }`}
                                >
                                    {res.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Border / Vignette Setting */}
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                        <h3 className="text-white font-semibold mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-sony-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                            Border Options (Tùy chọn viền)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleChange('useBorder', false)}
                                className={`py-3 px-4 rounded-lg border text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
                                    !config.useBorder
                                    ? 'bg-green-900/30 border-green-500 text-white ring-1 ring-green-500'
                                    : 'bg-black border-gray-700 text-gray-400'
                                }`}
                            >
                                <span>🚫 Không viền (Clean)</span>
                            </button>
                            <button
                                onClick={() => handleChange('useBorder', true)}
                                className={`py-3 px-4 rounded-lg border text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
                                    config.useBorder
                                    ? 'bg-orange-900/30 border-sony-accent text-white ring-1 ring-sony-accent'
                                    : 'bg-black border-gray-700 text-gray-400'
                                }`}
                            >
                                <span>🔳 Có viền (Cinematic)</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                        <h3 className="text-white font-semibold mb-3 flex items-center">
                            Google Drive
                        </h3>
                        <input
                            type="text"
                            value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            placeholder="Client ID (Optional)"
                            className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-xs"
                        />
                    </div>
                </div>
            )}

            {/* ==================== STUDIO TAB ==================== */}
            {controlTab === 'studio' && (
                <div className="space-y-4 animate-fade-in">
                    {selectedCount > 0 ? (
                        <div className="space-y-2">
                             <div className="p-3 bg-orange-900/20 border border-orange-500/50 rounded-lg">
                                <span className="text-sony-accent font-bold text-sm block">BATCH EDIT MODE</span>
                                <span className="text-gray-400 text-xs">Modifying {selectedCount} images.</span>
                            </div>
                            
                            {/* Upscale Controls */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onBatchUpscale('2k')}
                                    disabled={isGenerating}
                                    className="py-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/50 text-purple-200 text-xs font-bold rounded transition-colors"
                                >
                                    Scale to 2K (Gemini 3)
                                </button>
                                <button
                                    onClick={() => onBatchUpscale('4k')}
                                    disabled={isGenerating}
                                    className="py-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/50 text-purple-200 text-xs font-bold rounded transition-colors"
                                >
                                    Scale to 4K (Gemini 3)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                        {!uploadedImage ? (
                            <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-12 border-2 border-dashed border-gray-700 rounded-lg bg-black/50 hover:bg-gray-900/50 hover:border-sony-accent transition-all cursor-pointer flex flex-col items-center justify-center group"
                            >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <span className="text-[10px] text-gray-500 group-hover:text-gray-300">Upload Reference Image</span>
                            </div>
                        ) : (
                            <div className="relative w-full h-16 bg-black border border-gray-700 rounded-lg overflow-hidden group">
                                <img src={uploadedImage} alt="Ref" className="w-full h-full object-contain opacity-80" />
                                <button onClick={handleClearImage} className="absolute top-1 right-1 px-2 py-0.5 bg-red-900/80 text-white text-[9px] rounded border border-red-700">Remove</button>
                            </div>
                        )}
                        </div>
                    )}

                    {/* Style Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Style</label>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {STYLE_OPTIONS.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => handleChange('style', style.id)}
                                className={`flex flex-col items-center justify-center p-1 rounded-lg border transition-all h-14 group hover:bg-gray-800 ${
                                    config.style === style.id 
                                    ? 'bg-gray-800 border-sony-accent ring-1 ring-sony-accent shadow-lg shadow-orange-900/20'
                                    : 'bg-black border-gray-700 hover:border-gray-500'
                                }`}
                                title={style.desc}
                            >
                                <span className="text-base mb-1 group-hover:scale-110 transition-transform">{style.icon}</span>
                                <span className={`text-[8px] font-bold leading-tight text-center ${config.style === style.id ? 'text-white' : 'text-gray-400'}`}>{style.label}</span>
                            </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Palettes */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Color Palette</label>
                        <div className="flex overflow-x-auto custom-scrollbar pb-2 gap-2">
                             <button
                                onClick={() => handleChange('selectedPaletteId', null)}
                                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-[10px] font-bold transition-all whitespace-nowrap ${
                                    config.selectedPaletteId === null
                                    ? 'bg-gray-800 border-white text-white'
                                    : 'bg-black border-gray-700 text-gray-500'
                                }`}
                            >
                                None
                            </button>
                            {palettes.map(palette => (
                                <div 
                                    key={palette.id}
                                    onClick={() => handleChange('selectedPaletteId', palette.id)}
                                    className={`relative flex-shrink-0 w-24 p-1 rounded-lg border cursor-pointer transition-all group ${
                                        config.selectedPaletteId === palette.id
                                        ? 'border-sony-accent bg-gray-900 ring-1 ring-sony-accent'
                                        : 'border-gray-800 bg-black hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex h-6 w-full rounded overflow-hidden mb-1">
                                        {palette.colors.map((c, i) => (
                                            <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }}></div>
                                        ))}
                                    </div>
                                    <span className={`block text-[9px] text-center truncate ${config.selectedPaletteId === palette.id ? 'text-white' : 'text-gray-400'}`}>{palette.name}</span>
                                    
                                    {palette.isCustom && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeletePalette(palette.id); }}
                                            className="absolute -top-1 -right-1 bg-red-900 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            x
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Prompt */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prompt</label>
                            <div className="flex space-x-2">
                                {selectedCount === 0 && (
                                <button onClick={() => promptFileInputRef.current?.click()} className="text-[10px] text-sony-accent hover:text-white font-bold">
                                    IMPORT .TXT
                                </button>
                                )}
                                {batchPrompts.length > 0 && selectedCount === 0 && (
                                    <button onClick={clearBatch} className="text-[10px] text-red-400 hover:text-red-200">CLEAR BATCH</button>
                                )}
                                <input type="file" ref={promptFileInputRef} onChange={handlePromptFileChange} accept=".txt" className="hidden" />
                            </div>
                        </div>
                        {batchPrompts.length > 0 && selectedCount === 0 ? (
                            <div className="w-full bg-gray-900 border border-sony-accent rounded-lg p-2 text-xs text-gray-300 h-24 overflow-y-auto custom-scrollbar">
                                {batchPrompts.map((p, i) => <div key={i} className="truncate border-b border-gray-800 pb-1 mb-1 last:border-0">{i+1}. {p}</div>)}
                            </div>
                        ) : (
                            <textarea
                                value={config.prompt}
                                onChange={(e) => handleChange('prompt', e.target.value)}
                                placeholder={promptPlaceholder}
                                className={`w-full bg-black border rounded-lg p-3 text-white text-xs placeholder-gray-600 focus:ring-1 focus:ring-sony-accent focus:border-sony-accent transition-all h-24 resize-none ${selectedCount > 0 ? 'border-orange-500' : 'border-gray-700'}`}
                            />
                        )}
                    </div>

                    {/* Config Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Aspect Ratio</label>
                            <select
                                value={config.aspectRatio}
                                onChange={(e) => handleChange('aspectRatio', e.target.value as AspectRatio)}
                                className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-white text-xs focus:border-sony-accent outline-none"
                            >
                                {Object.values(AspectRatio).map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Batch Size</label>
                            <input
                                type="number" min="1" max="50"
                                value={config.batchCount}
                                disabled={selectedCount > 0}
                                onChange={(e) => handleChange('batchCount', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-black border border-gray-800 rounded px-2 py-2 text-white text-xs focus:border-sony-accent outline-none text-center"
                            />
                        </div>
                    </div>

                    {/* Background Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Background</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'black', label: 'Black', color: 'bg-black' },
                                { id: 'white', label: 'White', color: 'bg-white' },
                                { id: 'green', label: 'Green Screen', color: 'bg-[#00FF00]' }
                            ].map((bg) => (
                                <button
                                    key={bg.id}
                                    onClick={() => handleChange('background', bg.id as BackgroundColor)}
                                    className={`flex items-center justify-center px-2 py-2 rounded border transition-all text-[10px] font-bold ${
                                        config.background === bg.id 
                                        ? 'border-sony-accent ring-1 ring-sony-accent text-white bg-gray-900' 
                                        : 'border-gray-700 text-gray-400 bg-black hover:border-gray-500'
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full mr-1 border border-gray-600 ${bg.color}`}></div>
                                    {bg.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Perspectives */}
                    <div className={`${selectedCount > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Angles</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: 'includeFront', label: 'Front' },
                                { key: 'includeLeft', label: 'Left' },
                                { key: 'includeRight', label: 'Right' },
                                { key: 'includeTop', label: 'Top' },
                                { key: 'includeIsometric', label: 'Iso' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => handleChange(item.key as keyof GenerationConfig, !config[item.key as keyof GenerationConfig])}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                        config[item.key as keyof GenerationConfig] 
                                        ? 'bg-sony-accent text-white border-sony-accent' 
                                        : 'bg-black text-gray-500 border-gray-800'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* FIXED FOOTER - ALWAYS VISIBLE */}
      {controlTab === 'studio' && (
        <div className="p-4 bg-sony-dark border-t border-gray-800 shrink-0 z-20">
            {isGenerating ? (
                    <button onClick={onStop} className="w-full py-3 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg border border-red-700 animate-pulse text-sm">
                        STOP GENERATION
                    </button>
            ) : (
                <button
                onClick={onGenerate}
                disabled={(!config.prompt.trim() && batchPrompts.length === 0)}
                className={`w-full py-3 font-bold rounded-lg transition-all text-sm shadow-lg ${
                    (!config.prompt.trim() && batchPrompts.length === 0)
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-sony-accent hover:bg-orange-600 text-white shadow-orange-900/40'
                }`}
                >
                    {selectedCount > 0 
                        ? `BATCH EDIT (${selectedCount})`
                        : batchPrompts.length > 0 
                            ? `RUN BATCH (${batchPrompts.length * config.batchCount})` 
                            : 'GENERATE IMAGES'
                    }
                </button>
            )}
        </div>
      )}
    </div>
  );
};

export default Controls;