/**
 * API Service - Handles communication with the backend
 */

import { CommandResponse } from '@/types';

// Backend URL - aanpasbaar via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Send audio blob to the backend for processing
 */
export async function sendAudio(audioBlob: Blob): Promise<CommandResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  try {
    const response = await fetch(`${API_BASE_URL}/api/command`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data: CommandResponse = await response.json();
    return parseServerResponse(data);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Kan geen verbinding maken met de server. Is de backend gestart?');
    }
    throw error;
  }
}

/**
 * Send text command directly (useful for testing without microphone)
 */
export async function sendTextCommand(text: string): Promise<CommandResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data: CommandResponse = await response.json();
    return parseServerResponse(data);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Kan geen verbinding maken met de server. Is de backend gestart?');
    }
    throw error;
  }
}

/**
 * Parse and validate server response
 */
function parseServerResponse(data: any): CommandResponse {
  return {
    userTranscript: data.userTranscript || '',
    agentMessage: data.agentMessage || '',
    actionsLog: Array.isArray(data.actionsLog) ? data.actionsLog : [],
    audio: data.audio || '',
    intent: data.intent,
  };
}

/**
 * Health check - verify backend is running
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
