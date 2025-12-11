'use client';

import { useEffect, useRef } from 'react';

interface ActionLogProps {
  logs: string[];
}

export default function ActionLog({ logs }: ActionLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (log: string): string => {
    const lowerLog = log.toLowerCase();
    if (lowerLog.includes('intent')) return '🎯';
    if (lowerLog.includes('stt') || lowerLog.includes('transcript')) return '🎤';
    if (lowerLog.includes('tts') || lowerLog.includes('audio')) return '🔊';
    if (lowerLog.includes('formulier') || lowerLog.includes('form')) return '📝';
    if (lowerLog.includes('workflow') || lowerLog.includes('opgeslagen')) return '💾';
    if (lowerLog.includes('afspraak') || lowerLog.includes('appointment')) return '📅';
    if (lowerLog.includes('error') || lowerLog.includes('fout')) return '❌';
    if (lowerLog.includes('success') || lowerLog.includes('bevestigd')) return '✅';
    if (lowerLog.includes('playwright') || lowerLog.includes('browser')) return '🌐';
    return '📋';
  };

  return (
    <div className="action-log">
      <div className="log-header">
        <span className="log-icon">📋</span>
        <h3>Actielog</h3>
      </div>
      <div className="log-content">
        {logs.length === 0 ? (
          <p className="log-placeholder">
            Nog geen acties uitgevoerd...
          </p>
        ) : (
          <ul className="log-list">
            {logs.map((log, index) => (
              <li key={index} className="log-item">
                <span className="log-item-icon">{getLogIcon(log)}</span>
                <span className="log-item-text">{log}</span>
                <span className="log-item-time">
                  {new Date().toLocaleTimeString('nl-NL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </li>
            ))}
            <div ref={logEndRef} />
          </ul>
        )}
      </div>
    </div>
  );
}
