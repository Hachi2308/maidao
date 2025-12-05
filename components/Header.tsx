import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 border-b border-gray-800 bg-sony-black/90 backdrop-blur-md sticky top-0 z-50">
      {/* CHANGED: Widened from max-w-7xl to max-w-[95%] */}
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sony-accent to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Sony <span className="text-sony-accent">Macro</span> AI Studio
            </h1>
            <p className="text-xs text-gray-400">Powered by Gemini 2.5 Flash • <span className="text-green-400">New Styles Added</span></p>
          </div>
        </div>
        <div className="hidden md:block">
           <span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-full text-xs font-medium text-gray-300">
             High Fidelity Engine v2.1
           </span>
        </div>
      </div>
    </header>
  );
};

export default Header;