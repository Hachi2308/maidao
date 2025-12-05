
import React from 'react';
import { GeneratedImage } from '../types';

interface GalleryProps {
  images: GeneratedImage[];
  onImageClick: (img: GeneratedImage) => void;
  onDownloadAll: () => void;
  onClearHistory: () => void;
  onSaveToDrive: () => void;
  isSavingToDrive: boolean;
  driveStatus: string;
  onDeleteImage: (id: string) => void;
  selectedIds: Set<string>; // New
  onToggleSelect: (id: string) => void; // New
  onToggleSelectAll: () => void; // New
}

const Gallery: React.FC<GalleryProps> = ({ 
  images, 
  onImageClick, 
  onDownloadAll,
  onClearHistory, 
  onSaveToDrive,
  isSavingToDrive,
  driveStatus,
  onDeleteImage,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll
}) => {
  if (images.length === 0) return null;

  const handleDownload = (e: React.MouseEvent, img: GeneratedImage) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = img.url;
    
    // Logic: 6 words max, sanitize
    const shortPrompt = img.prompt ? img.prompt.split(' ').slice(0, 6).join(' ') : 'sony-macro';
    const slug = shortPrompt.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    const safeAngle = img.angle.replace(/\s+/g, '-').toLowerCase();

    link.download = `${slug}-${safeAngle}-${img.resolution}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      onDeleteImage(id);
  };
  
  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onToggleSelect(id);
  };

  const allSelected = images.length > 0 && selectedIds.size === images.length;

  return (
    <div className="mt-12 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
            History Gallery 
            {selectedIds.size > 0 && <span className="ml-2 text-sm px-2 py-0.5 bg-sony-accent rounded-full">{selectedIds.size} Selected</span>}
        </h2>
        <div className="flex items-center space-x-3">
            {/* Selection Toolbar */}
            <button 
                onClick={onToggleSelectAll}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 transition-colors mr-2"
            >
                {allSelected ? 'Deselect All' : 'Select All'}
            </button>

            {/* Save to Drive Button */}
            <button
              onClick={onSaveToDrive}
              disabled={isSavingToDrive}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 transition-colors border ${
                isSavingToDrive 
                 ? 'bg-gray-800 text-gray-400 border-gray-700 cursor-wait'
                 : 'bg-green-900/30 hover:bg-green-900/50 text-green-100 border-green-800 hover:border-green-600'
              }`}
              title="Requires Google Client ID"
            >
              {isSavingToDrive ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8.71,13.04L6.6,9.39L10.26,3.05H16.89L19,6.71L8.71,13.04ZM6.15,10.16L2.76,16.03L6.42,22.37H13.05L16.44,16.5L6.15,10.16ZM17.24,15.14L13.85,21L10.19,27.34H16.82L20.21,21.47L17.24,15.14Z" transform="translate(0 -2)"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none"/></svg>
              )}
              <span className="hidden sm:inline">{isSavingToDrive ? driveStatus || 'Saving...' : 'Drive'}</span>
            </button>

            {/* Download Local */}
            <button 
                onClick={onDownloadAll}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg flex items-center space-x-2 transition-colors border border-gray-700"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="hidden sm:inline">Zip All</span>
            </button>

             {/* Clear History */}
             <button 
                onClick={onClearHistory}
                className="px-3 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-200 text-sm font-medium rounded-lg flex items-center transition-colors border border-red-900/50"
                title="Delete ALL Images"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((img) => {
          const isSelected = selectedIds.has(img.id);
          return (
            <div 
                key={img.id} 
                className={`group relative bg-sony-dark rounded-xl overflow-hidden border transition-all hover:shadow-2xl ${
                    isSelected 
                    ? 'border-sony-accent ring-2 ring-sony-accent shadow-orange-900/20' 
                    : 'border-gray-800 hover:border-gray-500'
                }`}
            >
                {/* SELECTION CHECKBOX - Always visible on top-left */}
                <div 
                    onClick={(e) => handleCheckboxClick(e, img.id)}
                    className="absolute top-2 left-2 z-[60] cursor-pointer"
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected 
                        ? 'bg-sony-accent border-sony-accent' 
                        : 'bg-black/50 border-white/50 hover:bg-black/80 hover:border-white'
                    }`}>
                        {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                </div>

                {/* DELETE BUTTON - Absolutely positioned with high Z-index */}
                <button 
                    onClick={(e) => handleDelete(e, img.id)}
                    className="absolute top-2 right-2 z-[60] p-1.5 bg-red-900/80 text-white rounded hover:bg-red-600 transition-colors shadow-lg border border-red-700 opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete Image"
                >
                    <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>

                {/* Clickable Area for Modal */}
                <div 
                    onClick={() => onImageClick(img)}
                    className="cursor-zoom-in relative z-10"
                >
                    <div className="aspect-square w-full bg-black">
                    <img 
                        src={img.url} 
                        alt={img.prompt} 
                        loading="lazy"
                        className="w-full h-full object-contain"
                    />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent z-20 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex justify-between items-end">
                            <div className="w-3/4">
                                <p className="text-white font-semibold text-xs truncate">{img.prompt}</p>
                                <p className="text-gray-400 text-[10px] font-mono mt-0.5 uppercase flex items-center space-x-1">
                                    <span>{img.angle}</span>
                                    <span className="text-sony-accent">• {img.resolution}</span>
                                </p>
                            </div>
                            <button 
                                onClick={(e) => handleDownload(e, img)}
                                className="p-1.5 bg-white text-black rounded-full hover:bg-sony-accent hover:text-white transition-colors"
                                title="Download"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Gallery;
