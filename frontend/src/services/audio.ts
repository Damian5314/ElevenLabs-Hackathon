/**
 * Audio Service - Handles recording and playback
 */

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

/**
 * Start recording audio from the microphone
 */
export async function startRecording(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(100); // Collect data every 100ms
  } catch (error) {
    console.error('Error starting recording:', error);
    throw new Error('Kon microfoon niet starten. Controleer je browser permissies.');
  }
}

/**
 * Stop recording and return the audio blob
 */
export function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error('Geen actieve opname gevonden'));
      return;
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      // Stop all tracks to release microphone
      mediaRecorder?.stream.getTracks().forEach(track => track.stop());
      mediaRecorder = null;
      audioChunks = [];

      resolve(audioBlob);
    };

    mediaRecorder.onerror = (event) => {
      reject(new Error('Opname fout: ' + event.error));
    };

    mediaRecorder.stop();
  });
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

/**
 * Play audio from base64 string or URL
 */
export async function playAudioFromResponse(audioData: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      let audioUrl: string;

      // Check if it's a URL or base64
      if (audioData.startsWith('http://') || audioData.startsWith('https://')) {
        audioUrl = audioData;
      } else {
        // Assume base64 - convert to blob URL
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(audioBlob);
      }

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        // Clean up blob URL if we created one
        if (!audioData.startsWith('http')) {
          URL.revokeObjectURL(audioUrl);
        }
        resolve();
      };

      audio.onerror = (e) => {
        reject(new Error('Kon audio niet afspelen'));
      };

      audio.play().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convert blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
