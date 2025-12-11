'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import MicButton from '@/components/MicButton';
import ActionLog from '@/components/ActionLog';
import { startRecording, stopRecording, playAudioFromResponse } from '@/services/audio';
import { sendAudio } from '@/services/api';
import { RecordingState, PendingAction, ExecutionResult } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pendingAction?: PendingAction;
  actionExecuted?: boolean;
  executionResult?: ExecutionResult;
}

export default function Home() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, extra?: {
    pendingAction?: PendingAction;
    actionExecuted?: boolean;
    executionResult?: ExecutionResult;
  }) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      ...extra,
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      setError(null);
      await startRecording();
      setRecordingState('recording');
      addLog('Opname gestart');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon opname niet starten');
      setRecordingState('idle');
    }
  }, [addLog]);

  const handleStopRecording = useCallback(async () => {
    try {
      setRecordingState('processing');
      addLog('Opname gestopt, verwerken...');

      const audioBlob = await stopRecording();
      addLog('Audio verzenden naar server...');

      const response = await sendAudio(audioBlob);

      // Add user message
      if (response.userTranscript) {
        addMessage('user', response.userTranscript);
      }

      // Add all action logs from backend
      if (response.actionsLog && response.actionsLog.length > 0) {
        response.actionsLog.forEach((log) => addLog(log));
      }

      // Add assistant message
      if (response.agentMessage) {
        addMessage('assistant', response.agentMessage, {
          pendingAction: response.pendingAction,
          actionExecuted: response.actionExecuted,
          executionResult: response.executionResult,
        });
      }

      // Track pending action
      if (response.pendingAction) {
        setPendingAction(response.pendingAction);
        addLog('Wacht op bevestiging...');
      } else if (response.actionExecuted) {
        setPendingAction(null);
        if (response.executionResult?.success) {
          addLog('Actie succesvol uitgevoerd!');
        }
      } else {
        // For conversation or cancel, clear pending action
        if (response.intent?.type === 'cancel_action') {
          setPendingAction(null);
        }
      }

      // Play audio response if available
      if (response.audio) {
        addLog('Audio response afspelen...');
        try {
          await playAudioFromResponse(response.audio);
          addLog('Audio afgespeeld');
        } catch (audioErr) {
          addLog('Kon audio niet afspelen');
        }
      }

      setRecordingState('idle');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Er ging iets mis';
      setError(errorMessage);
      addLog(`Fout: ${errorMessage}`);
      setRecordingState('idle');
    }
  }, [addLog, addMessage]);

  const handleClearChat = () => {
    setMessages([]);
    setLogs([]);
    setPendingAction(null);
  };

  const handleReset = () => {
    setMessages([]);
    setLogs([]);
    setError(null);
    setPendingAction(null);
    setRecordingState('idle');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header Section */}
        <header className="text-center mb-8">
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

        {/* Pending Action Banner */}
        {pendingAction && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <p className="flex-1 text-amber-200">
              Er wacht een actie op bevestiging. Zeg <strong className="text-amber-100">"ja"</strong> om te bevestigen of <strong className="text-amber-100">"nee"</strong> om te annuleren.
            </p>
          </div>
        )}

        {/* Chat Container */}
        <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl mb-6 overflow-hidden">
          {/* Chat Messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-300 text-lg mb-2">Start een gesprek met LifeAdmin!</p>
                <p className="text-gray-500 text-sm max-w-md">
                  Druk op de microfoonknop en zeg iets zoals "Hoi" of "Wat kun je allemaal?"
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🤖</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                        : 'bg-gray-700/50 text-gray-200'
                    }`}
                  >
                    <p className="leading-relaxed">{message.content}</p>

                    {/* Execution result badge */}
                    {message.actionExecuted && message.executionResult && (
                      <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        message.executionResult.success
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {message.executionResult.success ? '✓ Uitgevoerd' : '✗ Mislukt'}
                      </div>
                    )}

                    {/* Pending action badge */}
                    {message.pendingAction && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300">
                        ⏳ Wacht op bevestiging
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">👤</span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Microphone Button */}
        <div className="flex flex-col items-center mb-8">
          <MicButton
            recordingState={recordingState}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
          {recordingState === 'processing' && (
            <p className="mt-3 text-emerald-400 animate-pulse">Verwerken...</p>
          )}
          {recordingState === 'recording' && (
            <p className="mt-3 text-red-400 animate-pulse">Opname actief...</p>
          )}
        </div>

        {/* Action Log Section */}
        <div className="mb-8">
          <ActionLog logs={logs} />
        </div>

        {/* Button Section */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleClearChat}
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 border border-emerald-500/20 rounded-xl text-gray-200 hover:text-emerald-400 hover:border-emerald-500/40 transition-all duration-300"
          >
            <Trash2 className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
            <span>Gesprek wissen</span>
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
