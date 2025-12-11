'use client';

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
    // Don't do anything if processing
  };

  const getButtonText = () => {
    switch (recordingState) {
      case 'idle':
        return 'Klik om te spreken';
      case 'recording':
        return 'Opnemen... Klik om te stoppen';
      case 'processing':
        return 'Verwerken...';
    }
  };

  const getButtonIcon = () => {
    switch (recordingState) {
      case 'idle':
        return (
          <svg viewBox="0 0 24 24" className="mic-icon">
            <path
              fill="currentColor"
              d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"
            />
            <path
              fill="currentColor"
              d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
            />
          </svg>
        );
      case 'recording':
        return (
          <svg viewBox="0 0 24 24" className="mic-icon recording">
            <circle cx="12" cy="12" r="8" fill="currentColor" />
          </svg>
        );
      case 'processing':
        return (
          <svg viewBox="0 0 24 24" className="mic-icon spinning">
            <path
              fill="currentColor"
              d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
            />
          </svg>
        );
    }
  };

  return (
    <button
      className={`mic-button ${recordingState}`}
      onClick={handleClick}
      disabled={disabled || recordingState === 'processing'}
      aria-label={getButtonText()}
    >
      <div className="mic-button-inner">
        {getButtonIcon()}
      </div>
      <span className="mic-button-text">{getButtonText()}</span>
      {recordingState === 'recording' && (
        <div className="pulse-ring" />
      )}
    </button>
  );
}
