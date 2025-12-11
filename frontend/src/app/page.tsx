'use client';

import { useState, useCallback } from 'react';
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
    <main className="main-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🎙️</span>
          <h1>LifeAdmin</h1>
        </div>
        <p className="tagline">Jouw persoonlijke voice-powered life admin assistent</p>
      </header>

      {/* Error display */}
      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Main content */}
      <div className="content">
        {/* Mic button section */}
        <section className="mic-section">
          <MicButton
            recordingState={recordingState}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        </section>

        {/* Transcript panels */}
        <section className="transcript-section">
          <TranscriptPanel
            userTranscript={userTranscript}
            agentMessage={agentMessage}
            isProcessing={recordingState === 'processing'}
          />
        </section>

        {/* Action log */}
        <section className="log-section">
          <ActionLog logs={logs} />
        </section>
      </div>

      {/* Footer with controls */}
      <footer className="footer">
        <button onClick={handleClearLogs} className="footer-btn">
          🗑️ Logs wissen
        </button>
        <button onClick={handleReset} className="footer-btn">
          🔄 Reset
        </button>
      </footer>
    </main>
  );
}
