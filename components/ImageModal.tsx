import React, { useState, useEffect } from 'react';
import { GeneratedImage } from '../types';

interface ImageModalProps {
  image: GeneratedImage | null;
  onClose: () => void;
  onEdit: (image: GeneratedImage, newPrompt: string) => void;
  isGenerating: boolean;
}

const ImageModal: React.FC<ImageModalProps> = ({ image, onClose, onEdit, isGenerating }) => {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (image) {
      setPrompt(image.prompt);
    }
  }, [image]);

  if (!image) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `sony-macro-${image.resolution}-${image.angle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditSubmit = () => {
      if (prompt.trim()) {
          onEdit(image, prompt);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-sony-accent transition-colors z-50"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <div className="relative max-w-6xl w-full h-[90vh] flex flex-col md:flex-row bg-black border border-gray-800 rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
         
         {/* Left: Image Area */}
         <div className="w-full md:w-2/3 h-1/2 md:h-full bg-gray-900/50 relative flex items-center justify-center p-4">
             <img 
              src={image.url} 
              alt={image.prompt} 
              className="max-w-full max-h-full object-contain shadow-lg"
            />
         </div>
         
         {/* Right: Details & Edit */}
         <div className="w-full md:w-1/3 h-1/2 md:h-full p-6 flex flex-col justify-between bg-sony-dark border-l border-gray-800">
             
             <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                 <div>
                    <h3 className="text-xl font-bold text-white">{image.angle} View</h3>
                    <div className="flex space-x-2 mt-1">
                         <span className="px-2 py-1 bg-gray-800 text-xs rounded text-gray-300 uppercase font-mono border border-gray-700">{image.resolution}</span>
                         <span className="px-2 py-1 bg-gray-800 text-xs rounded text-gray-300 uppercase font-mono border border-gray-700">{new Date(image.timestamp).toLocaleTimeString()}</span>
                    </div>
                 </div>

                 <div className="bg-black p-4 rounded-lg border border-gray-800">
                     <label className="text-xs text-sony-accent font-bold uppercase mb-2 block">Edit / Regenerate</label>
                     <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-gray-900 text-white text-sm p-3 rounded border border-gray-700 focus:border-sony-accent focus:outline-none resize-none h-32"
                        placeholder="Modify prompt to edit..."
                     />
                     <button
                        onClick={handleEditSubmit}
                        disabled={isGenerating || !prompt.trim()}
                        className={`mt-3 w-full py-2 rounded font-medium text-sm transition-all flex items-center justify-center ${
                            isGenerating 
                             ? 'bg-gray-800 text-gray-500 cursor-wait'
                             : 'bg-white text-black hover:bg-sony-accent hover:text-white'
                        }`}
                     >
                         {isGenerating ? (
                             <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Processing...
                             </>
                         ) : (
                             'Regenerate with Changes'
                         )}
                     </button>
                     <p className="text-[10px] text-gray-500 mt-2">
                         Uses this image as a visual reference.
                     </p>
                 </div>
             </div>

             <div className="pt-4 border-t border-gray-800">
                <button 
                    onClick={handleDownload}
                    className="w-full px-6 py-3 bg-sony-accent hover:bg-orange-600 text-white rounded-lg font-bold transition-colors shadow-lg shadow-orange-900/30 flex items-center justify-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>Download PNG</span>
                </button>
             </div>
         </div>
      </div>
    </div>
  );
};

export default ImageModal;