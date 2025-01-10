// retrySetup.ts

import { Socket } from 'socket.io-client';

interface RetrySetupOptions {
  socket: Socket;
  mediaStreamsEstablished: boolean;
  isRetrying: boolean;
  retryCount: number;
  maxRetries?: number;
  retryDelay?: number;
  onRetryStart: () => void;
  onRetryEnd: () => void;
  onMaxRetriesReached: (message: string) => void;
  setRetryCount: (cb: (prevCount: number) => number) => void;
}

export const handleRetrySetup = ({
  socket,
  mediaStreamsEstablished,
  isRetrying,
  retryCount,
  maxRetries = 3,
  retryDelay = 2000,
  onRetryStart,
  onRetryEnd,
  onMaxRetriesReached,
  setRetryCount,
}: RetrySetupOptions): void => {
  if (retryCount < maxRetries && !mediaStreamsEstablished && !isRetrying) {
    console.log(`Retrying call setup (Attempt ${retryCount + 1})...`);
    onRetryStart();
    setRetryCount((prevCount) => prevCount + 1);
    setTimeout(() => {
      socket.emit("requestTurnCredentials");
      onRetryEnd();
    }, retryDelay);
  } else if (!mediaStreamsEstablished && retryCount >= maxRetries) {
    console.log("Max retry attempts reached. Call setup failed.");
    onMaxRetriesReached("Failed to establish connection after multiple attempts.");
  }
};
