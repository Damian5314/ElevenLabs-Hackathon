'use client';

import { useState, useCallback } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import MicButton from '@/components/MicButton';
import TranscriptPanel from '@/components/TranscriptPanel';
import ActionLog from '@/components/ActionLog';
import { startRecording, stopRecording, playAudioFromResponse } from '@/services/audio';
import { sendAudio } from '@/services/api';
import { RecordingState } from '@/types';

export default function Home() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [agentMessage, setAgentMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      setError(null);
      await startRecording();
      setRecordingState('recording');
      addLog('🎤 Opname gestart');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon opname niet starten');
      setRecordingState('idle');
    }
  }, [addLog]);

  const handleStopRecording = useCallback(async () => {
    try {
      setRecordingState('processing');
      addLog('⏹️ Opname gestopt, verwerken...');

      const audioBlob = await stopRecording();
      addLog('📤 Audio verzenden naar server...');

      const response = await sendAudio(audioBlob);

      // Update UI with response
      setUserTranscript(response.userTranscript);
      setAgentMessage(response.agentMessage);

      // Add all action logs from backend
      if (response.actionsLog && response.actionsLog.length > 0) {
        response.actionsLog.forEach((log) => addLog(log));
      }

      // Play audio response if available
      if (response.audio) {
        addLog('🔊 Audio response afspelen...');
        try {
          await playAudioFromResponse(response.audio);
          addLog('✅ Audio afgespeeld');
        } catch (audioErr) {
          addLog('⚠️ Kon audio niet afspelen');
        }
      }

      setRecordingState('idle');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Er ging iets mis';
      setError(errorMessage);
      addLog(`❌ Fout: ${errorMessage}`);
      setRecordingState('idle');
    }
  }, [addLog]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleReset = () => {
    setUserTranscript('');
    setAgentMessage('');
    setLogs([]);
    setError(null);
    setRecordingState('idle');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              LifeAdmin
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            Jouw persoonlijke voice-powered life admin assistent
          </p>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="flex-1 text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-200 hover:text-red-100 text-2xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        )}

        {/* Microphone Button */}
        <div className="flex justify-center mb-12">
          <MicButton
            recordingState={recordingState}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        </div>

        {/* Two-Column Chat Panels */}
        <TranscriptPanel
          userTranscript={userTranscript}
          agentMessage={agentMessage}
          isProcessing={recordingState === 'processing'}
        />

        {/* Action Log Section */}
        <div className="mt-8">
          <ActionLog logs={logs} />
        </div>

        {/* Button Section */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={handleClearLogs}
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 border border-emerald-500/20 rounded-xl text-gray-200 hover:text-emerald-400 hover:border-emerald-500/40 transition-all duration-300"
          >
            <Trash2 className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
            <span>Logs wissen</span>
          </button>
          <button
            onClick={handleReset}
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 border border-emerald-500/20 rounded-xl text-gray-200 hover:text-emerald-400 hover:border-emerald-500/40 transition-all duration-300"
          >
            <RotateCcw className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-180" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </main>
  );
}
