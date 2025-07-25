// Browser Speech Recognition Fallback
// Uses Web Speech API as lightweight alternative to WhisperX

import React, { useState, useEffect } from 'react';

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface BrowserSpeechProps {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
}

export const BrowserSpeechRecognition: React.FC<BrowserSpeechProps> = ({
  onTranscription,
  onError,
  isRecording,
  onRecordingChange
}) => {
  const [recognition, setRecognition] = useState<any | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        console.log('🎤 Browser speech recognition started');
      };
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        if (finalTranscript) {
          onTranscription(finalTranscript);
        }
        
        setInterimTranscript(interimTranscript);
      };
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        onError(`Speech recognition error: ${event.error}`);
        onRecordingChange(false);
      };
      
      recognitionInstance.onend = () => {
        console.log('🎤 Browser speech recognition ended');
        onRecordingChange(false);
      };
      
      setRecognition(recognitionInstance);
      setIsSupported(true);
    } else {
      setIsSupported(false);
      onError('Speech recognition not supported in this browser');
    }
  }, [onTranscription, onError, onRecordingChange]);

  const startRecording = () => {
    if (recognition && !isRecording) {
      recognition.start();
      onRecordingChange(true);
    }
  };

  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
      onRecordingChange(false);
    }
  };

  return (
    <div className="browser-speech-recognition">
      <div className="speech-status">
        {isSupported ? (
          <span className="supported">🟢 Browser Speech Recognition Available</span>
        ) : (
          <span className="not-supported">🔴 Browser Speech Recognition Not Supported</span>
        )}
      </div>
      
      {isSupported && (
        <>
          <div className="speech-controls">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`browser-speech-button ${isRecording ? 'recording' : ''}`}
            >
              {isRecording ? '🎙️ Stop Recording' : '🎤 Start Browser Recording'}
            </button>
          </div>
          
          {interimTranscript && (
            <div className="interim-transcript">
              <strong>Interim:</strong> <em>{interimTranscript}</em>
            </div>
          )}
          
          <div className="browser-speech-info">
            <p>💡 <strong>Browser Speech Recognition</strong></p>
            <p>• Works offline, no server required</p>
            <p>• Less accurate than WhisperX</p>
            <p>• Good for quick testing</p>
            <p>• Supported in Chrome, Safari, Edge</p>
          </div>
        </>
      )}
    </div>
  );
};

// CSS styles for the browser speech component
export const browserSpeechStyles = `
.browser-speech-recognition {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 10px;
  padding: 15px;
  margin: 15px 0;
}

.speech-status {
  margin-bottom: 10px;
  text-align: center;
}

.speech-status .supported {
  color: #27ae60;
  font-weight: 500;
}

.speech-status .not-supported {
  color: #e74c3c;
  font-weight: 500;
}

.browser-speech-button {
  background: linear-gradient(45deg, #f39c12, #e67e22);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 10px 0;
}

.browser-speech-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(243, 156, 18, 0.4);
}

.browser-speech-button.recording {
  background: linear-gradient(45deg, #e74c3c, #c0392b);
  animation: pulse 1s infinite;
}

.interim-transcript {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
  border-left: 3px solid #f39c12;
}

.browser-speech-info {
  font-size: 14px;
  color: #856404;
}

.browser-speech-info p {
  margin: 5px 0;
}
`; 