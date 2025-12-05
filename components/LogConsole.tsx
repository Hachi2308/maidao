
import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface LogConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

const LogConsole: React.FC<LogConsoleProps> = ({ logs, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when logs update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black border border-gray-800 rounded-xl overflow-hidden shadow-lg animate-fade-in-up">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <h3 className="text-sm font-mono font-medium text-gray-300">System Logs</h3>
        <button 
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          Clear Logs
        </button>
      </div>
      
      <div className="h-[500px] overflow-y-auto p-4 font-mono text-xs space-y-2 bg-black custom-scrollbar">
        {logs.length === 0 && (
            <div className="text-gray-700 italic text-center mt-20">No logs available</div>
        )}
        
        {logs.slice().reverse().map((log, idx) => (
          <div key={idx} className="flex space-x-3 border-b border-gray-900/50 pb-1 last:border-0">
            <span className="text-gray-600 flex-shrink-0 w-20">{log.timestamp}</span>
            <span className={`flex-1 break-all ${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-green-400' :
              log.type === 'warning' ? 'text-yellow-400' :
              'text-blue-300'
            }`}>
              {log.type === 'error' && '❌ '}
              {log.type === 'success' && '✅ '}
              {log.type === 'warning' && '⚠️ '}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogConsole;
