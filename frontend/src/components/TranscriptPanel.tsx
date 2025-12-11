'use client';

import { User, Bot } from 'lucide-react';

interface TranscriptPanelProps {
  userTranscript: string;
  agentMessage: string;
  isProcessing: boolean;
}

export default function TranscriptPanel({
  userTranscript,
  agentMessage,
  isProcessing,
}: TranscriptPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User Panel (Left) */}
      <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl overflow-hidden min-h-[150px]">
        <div className="flex items-center gap-3 p-4 border-b border-emerald-500/20">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-200">Jij zei:</h3>
        </div>
        <div className="p-5">
          {userTranscript ? (
            <p className="text-gray-300 leading-relaxed">{userTranscript}</p>
          ) : (
            <p className="text-gray-500 italic">
              Spreek een opdracht in via de microfoon...
            </p>
          )}
        </div>
      </div>

      {/* Assistant Panel (Right) */}
      <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl overflow-hidden min-h-[150px]">
        <div className="flex items-center gap-3 p-4 border-b border-emerald-500/20">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg">
            <Bot className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-gray-200">LifeAdmin:</h3>
        </div>
        <div className="p-5">
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-gray-400 text-sm">Aan het typen...</span>
            </div>
          ) : agentMessage ? (
            <p className="text-gray-300 leading-relaxed">{agentMessage}</p>
          ) : (
            <p className="text-gray-500 italic">Wacht op je opdracht...</p>
          )}
        </div>
      </div>
    </div>
  );
}
