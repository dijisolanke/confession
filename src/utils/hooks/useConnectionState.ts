// useConnectionState.ts
import { useState, useCallback, useEffect } from 'react';
import { 
  handleConnectionFailure, 
  MAX_RETRY_ATTEMPTS 
} from '../connectionUtils';
import { socket } from '../socketUtils';

interface UseConnectionStateReturn {
  retryCount: number;
  isRetrying: boolean;
  mediaStreamsEstablished: boolean;
  handleRetry: () => void;
  setMediaStreamsEstablished: (value: boolean) => void;
}

export const useConnectionState = (
  peerConnection: RTCPeerConnection | null
): UseConnectionStateReturn => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [mediaStreamsEstablished, setMediaStreamsEstablished] = useState(false);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    handleConnectionFailure(
      peerConnection,
      () => {
        socket.emit('requestTurnCredentials');
        setIsRetrying(false);
      },
      () => {
        setIsRetrying(false);
        // Handle max retries reached
      },
      retryCount,
      mediaStreamsEstablished,
      isRetrying
    );
  }, [peerConnection, retryCount, mediaStreamsEstablished, isRetrying]);

  useEffect(() => {
    if (peerConnection) {
      const handleConnectionStateChange = () => {
        if (peerConnection.connectionState === 'connected') {
          setMediaStreamsEstablished(true);
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          setMediaStreamsEstablished(false);
          if (!isRetrying) {
            handleRetry();
          }
        }
      };

      peerConnection.addEventListener('connectionstatechange', handleConnectionStateChange);

      return () => {
        peerConnection.removeEventListener('connectionstatechange', handleConnectionStateChange);
      };
    }
  }, [peerConnection, isRetrying, handleRetry]);

  return {
    retryCount,
    isRetrying,
    mediaStreamsEstablished,
    handleRetry,
    setMediaStreamsEstablished
  };
};
