'use client';

import { Mic, Loader2 } from 'lucide-react';
import { RecordingState } from '@/types';

interface MicButtonProps {
  recordingState: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export default function MicButton({
  recordingState,
  onStartRecording,
  onStopRecording,
  disabled = false,
}: MicButtonProps) {
  const handleClick = () => {
    if (recordingState === 'idle') {
      onStartRecording();
    } else if (recordingState === 'recording') {
      onStopRecording();
    }
  };

  const getButtonText = () => {
    switch (recordingState) {
      case 'idle':
        return 'Klik om te spreken';
      case 'recording':
        return 'Aan het luisteren...';
      case 'processing':
        return 'Verwerken...';
    }
  };

  const isActive = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={`
          relative w-40 h-40 rounded-full
          transition-all duration-300
          ${
            isActive
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_0_40px_rgba(16,185,129,0.6)] scale-105'
              : 'bg-gradient-to-br from-gray-700 to-gray-800 hover:scale-110 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
          }
          disabled:opacity-70 disabled:cursor-not-allowed
          group
        `}
        aria-label={getButtonText()}
      >
        {/* Pulsing ring when active */}
        {isActive && (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 animate-ping opacity-75" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse" />
          </>
        )}

        {/* Icon */}
        <div className="relative z-10 flex items-center justify-center h-full">
          {isProcessing ? (
            <Loader2 className="w-16 h-16 text-white animate-spin" />
          ) : (
            <Mic
              className={`w-16 h-16 text-white transition-transform duration-300 ${
                isActive ? 'scale-110' : 'group-hover:scale-110'
              }`}
            />
          )}
        </div>
      </button>

      {/* Status text */}
      <p
        className={`text-sm font-medium transition-colors duration-300 ${
          isActive ? 'text-emerald-400' : 'text-gray-400'
        }`}
      >
        {getButtonText()}
      </p>
    </div>
  );
}
