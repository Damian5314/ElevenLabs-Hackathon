'use client';

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
    <div className="transcript-container">
      {/* User transcript */}
      <div className="transcript-panel user-panel">
        <div className="panel-header">
          <span className="panel-icon">👤</span>
          <h3>Jij zei:</h3>
        </div>
        <div className="panel-content">
          {userTranscript ? (
            <p>{userTranscript}</p>
          ) : (
            <p className="placeholder">
              Spreek een opdracht in via de microfoon...
            </p>
          )}
        </div>
      </div>

      {/* Agent response */}
      <div className="transcript-panel agent-panel">
        <div className="panel-header">
          <span className="panel-icon">🤖</span>
          <h3>LifeAdmin:</h3>
        </div>
        <div className="panel-content">
          {isProcessing ? (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : agentMessage ? (
            <p>{agentMessage}</p>
          ) : (
            <p className="placeholder">
              Wacht op je opdracht...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
