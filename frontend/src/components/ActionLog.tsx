'use client';

import { useEffect, useRef } from 'react';
import { ClipboardList } from 'lucide-react';

interface ActionLogProps {
  logs: string[];
}

export default function ActionLog({ logs }: ActionLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-emerald-500/20">
        <div className="p-2 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg">
          <ClipboardList className="w-5 h-5 text-pink-400" />
        </div>
        <h3 className="font-semibold text-gray-200">Actielog</h3>
      </div>

      {/* Content */}
      <div className="p-5 max-h-64 overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <p className="text-gray-500 italic">Nog geen acties uitgevoerd...</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm text-gray-300 animate-fade-in"
              >
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></span>
                <span className="flex-1">{log}</span>
              </li>
            ))}
            <div ref={logEndRef} />
          </ul>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
