'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw, Square } from 'lucide-react';
import MicButton from '@/components/MicButton';
import ActionLog from '@/components/ActionLog';
import ProviderCard from '@/components/ProviderCard';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import { startRecording, stopRecording, playAudioFromResponse, stopAudio, isPlaying } from '@/services/audio';
import { sendAudio, sendTextCommand } from '@/services/api';
import { RecordingState, Provider, TimeSlot, ExecutionResult } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  providers?: Provider[];
  selectedProvider?: Provider;
  availableSlots?: TimeSlot[];
  actionExecuted?: boolean;
  executionResult?: ExecutionResult;
}

export default function Home() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isProcessingClick, setIsProcessingClick] = useState(false);

  // Current booking state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check audio playback status
  useEffect(() => {
    audioCheckInterval.current = setInterval(() => {
      setIsPlayingAudio(isPlaying());
    }, 100);

    return () => {
      if (audioCheckInterval.current) {
        clearInterval(audioCheckInterval.current);
      }
    };
  }, []);

  const handleStopAudio = useCallback(() => {
    stopAudio();
    setIsPlayingAudio(false);
  }, []);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  const addMessage = useCallback((
    role: 'user' | 'assistant',
    content: string,
    extra?: {
      providers?: Provider[];
      selectedProvider?: Provider;
      availableSlots?: TimeSlot[];
      actionExecuted?: boolean;
      executionResult?: ExecutionResult;
    }
  ) => {
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
      addLog('Verwerken...');

      const audioBlob = await stopRecording();
      const response = await sendAudio(audioBlob);

      // Add user message
      if (response.userTranscript) {
        addMessage('user', response.userTranscript);
      }

      // Add logs
      if (response.actionsLog) {
        response.actionsLog.forEach((log) => addLog(log));
      }

      // Update booking state
      if (response.providers && response.providers.length > 0) {
        setProviders(response.providers);
        setSelectedProvider(null);
        setAvailableSlots([]);
      }

      if (response.selectedProvider) {
        setSelectedProvider(response.selectedProvider);
        if (response.availableSlots) {
          setAvailableSlots(response.availableSlots);
        }
      }

      // If action was executed (booking complete), clear state
      if (response.actionExecuted && response.executionResult?.success) {
        setProviders([]);
        setSelectedProvider(null);
        setAvailableSlots([]);
      }

      // Add assistant message with context
      if (response.agentMessage) {
        addMessage('assistant', response.agentMessage, {
          providers: response.providers,
          selectedProvider: response.selectedProvider,
          availableSlots: response.availableSlots,
          actionExecuted: response.actionExecuted,
          executionResult: response.executionResult,
        });
      }

      // Play audio
      if (response.audio) {
        try {
          await playAudioFromResponse(response.audio);
        } catch {
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

  const handleReset = () => {
    handleStopAudio();
    setMessages([]);
    setLogs([]);
    setError(null);
    setProviders([]);
    setSelectedProvider(null);
    setAvailableSlots([]);
    setRecordingState('idle');
    setIsProcessingClick(false);
  };

  // Handle provider click - send text command
  const handleProviderClick = useCallback(async (index: number) => {
    if (isProcessingClick || recordingState === 'processing') return;

    setIsProcessingClick(true);
    handleStopAudio(); // Stop any playing audio
    addLog(`Selecteer praktijk ${index + 1}...`);

    try {
      const response = await sendTextCommand(`nummer ${index + 1}`);

      // Add user message
      addMessage('user', `Nummer ${index + 1}`);

      // Add logs
      if (response.actionsLog) {
        response.actionsLog.forEach((log) => addLog(log));
      }

      // Update booking state
      if (response.selectedProvider) {
        setSelectedProvider(response.selectedProvider);
        if (response.availableSlots) {
          setAvailableSlots(response.availableSlots);
        }
      }

      // Add assistant message
      if (response.agentMessage) {
        addMessage('assistant', response.agentMessage, {
          selectedProvider: response.selectedProvider,
          availableSlots: response.availableSlots,
        });
      }

      // Play audio
      if (response.audio) {
        try {
          await playAudioFromResponse(response.audio);
        } catch {
          addLog('Kon audio niet afspelen');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Er ging iets mis';
      setError(errorMessage);
      addLog(`Fout: ${errorMessage}`);
    } finally {
      setIsProcessingClick(false);
    }
  }, [isProcessingClick, recordingState, handleStopAudio, addLog, addMessage]);

  // Handle time slot click - send text command
  const handleSlotClick = useCallback(async (date: string, time: string) => {
    if (isProcessingClick || recordingState === 'processing') return;

    setIsProcessingClick(true);
    handleStopAudio(); // Stop any playing audio
    addLog(`Selecteer tijdslot ${date} ${time}...`);

    try {
      const response = await sendTextCommand(`${date} om ${time}`);

      // Add user message
      addMessage('user', `${date} om ${time}`);

      // Add logs
      if (response.actionsLog) {
        response.actionsLog.forEach((log) => addLog(log));
      }

      // If action was executed (booking complete), clear state
      if (response.actionExecuted && response.executionResult?.success) {
        setProviders([]);
        setSelectedProvider(null);
        setAvailableSlots([]);
      }

      // Add assistant message
      if (response.agentMessage) {
        addMessage('assistant', response.agentMessage, {
          actionExecuted: response.actionExecuted,
          executionResult: response.executionResult,
        });
      }

      // Play audio
      if (response.audio) {
        try {
          await playAudioFromResponse(response.audio);
        } catch {
          addLog('Kon audio niet afspelen');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Er ging iets mis';
      setError(errorMessage);
      addLog(`Fout: ${errorMessage}`);
    } finally {
      setIsProcessingClick(false);
    }
  }, [isProcessingClick, recordingState, handleStopAudio, addLog, addMessage]);

  // Check if we're in booking flow
  const isShowingProviders = providers.length > 0 && !selectedProvider;
  const isShowingSlots = selectedProvider && availableSlots.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              LifeAdmin
            </h1>
          </div>
          <p className="text-gray-400">Jouw voice-powered assistent</p>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-center gap-3">
            <span>⚠️</span>
            <p className="flex-1 text-red-200 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-red-100">×</button>
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Chat */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl overflow-hidden">
              {/* Chat Messages */}
              <div className="h-[350px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="text-5xl mb-3">💬</div>
                    <p className="text-gray-300 mb-1">Start een gesprek!</p>
                    <p className="text-gray-500 text-sm">Zeg "Hoi" of "Zoek een tandarts"</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <span>🤖</span>
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 ${
                          message.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700/50 text-gray-200'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        {message.actionExecuted && message.executionResult && (
                          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            message.executionResult.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {message.executionResult.success ? '✓ Geboekt!' : '✗ Mislukt'}
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                          <span>👤</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Mic Button */}
              <div className="border-t border-emerald-500/20 p-4 flex flex-col items-center">
                {isPlayingAudio ? (
                  <button
                    onClick={handleStopAudio}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:shadow-red-500/30"
                  >
                    <Square className="w-6 h-6 text-white fill-white" />
                  </button>
                ) : (
                  <MicButton
                    recordingState={recordingState}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                  />
                )}
                {isPlayingAudio && (
                  <p className="mt-2 text-red-400 text-sm animate-pulse">Klik om te stoppen</p>
                )}
                {isProcessingClick && (
                  <p className="mt-2 text-emerald-400 text-sm animate-pulse">Selectie verwerken...</p>
                )}
                {recordingState === 'processing' && !isProcessingClick && (
                  <p className="mt-2 text-emerald-400 text-sm animate-pulse">Verwerken...</p>
                )}
                {recordingState === 'recording' && (
                  <p className="mt-2 text-red-400 text-sm animate-pulse">Luisteren...</p>
                )}
              </div>
            </div>

            {/* Action Log (collapsed) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-gray-400 text-sm hover:text-gray-300">
                Logs tonen ({logs.length})
              </summary>
              <div className="mt-2">
                <ActionLog logs={logs} />
              </div>
            </details>
          </div>

          {/* Right: Providers / Slots */}
          <div className="space-y-4">
            {/* Provider Cards */}
            {isShowingProviders && (
              <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  🦷 Tandartspraktijken
                </h3>
                <div className="space-y-3">
                  {providers.slice(0, 5).map((provider, index) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      index={index}
                      isSelected={false}
                      onClick={() => handleProviderClick(index)}
                      disabled={isProcessingClick}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500 text-center">
                  Klik op een praktijk of zeg "kies de beste"
                </p>
              </div>
            )}

            {/* Selected Provider + Time Slots */}
            {isShowingSlots && selectedProvider && (
              <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  ✓ Gekozen praktijk
                </h3>
                <ProviderCard
                  provider={selectedProvider}
                  index={0}
                  isSelected={true}
                />
                <div className="mt-4">
                  <TimeSlotPicker
                    slots={availableSlots}
                    onSlotClick={handleSlotClick}
                    disabled={isProcessingClick}
                  />
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isShowingProviders && !isShowingSlots && (
              <div className="backdrop-blur-sm bg-white/5 border border-emerald-500/20 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-gray-300 text-sm mb-2">Klaar om te helpen!</p>
                <p className="text-gray-500 text-xs">
                  Zeg "Zoek een tandarts" om te beginnen
                </p>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:text-white hover:border-gray-600 transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Opnieuw beginnen</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
