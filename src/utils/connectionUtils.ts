// connectionUtils.ts
export interface ConnectionState {
    isRetrying: boolean;
    retryCount: number;
    mediaStreamsEstablished: boolean;
    connectionState: RTCPeerConnectionState;
  }
  
  export const MAX_RETRY_ATTEMPTS = 3;
  export const RETRY_DELAY = 2000;
  
  export const shouldRetry = (
    retryCount: number,
    mediaStreamsEstablished: boolean,
    isRetrying: boolean
  ): boolean => {
    return retryCount < MAX_RETRY_ATTEMPTS && 
           !mediaStreamsEstablished && 
           !isRetrying;
  };
  
  export const handleConnectionFailure = (
    pc: RTCPeerConnection | null,
    onRetry: () => void,
    onMaxRetriesReached: () => void,
    retryCount: number,
    mediaStreamsEstablished: boolean,
    isRetrying: boolean
  ): void => {
    if (pc) {
      pc.close();
    }
  
    if (shouldRetry(retryCount, mediaStreamsEstablished, isRetrying)) {
      console.log(`Attempting retry (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
      setTimeout(onRetry, RETRY_DELAY);
    } else if (!mediaStreamsEstablished) {
      console.log("Max retry attempts reached. Connection failed.");
      onMaxRetriesReached();
    }
  };
  
  export const checkStreamStatus = (
    localStream: MediaStream | null,
    remoteStream: MediaStream | null
  ): boolean => {
    if (!localStream || !remoteStream) return false;
  
    const hasLocalTracks = 
      localStream.getVideoTracks().some(track => track.enabled) &&
      localStream.getAudioTracks().some(track => track.enabled);
  
    const hasRemoteTracks = 
      remoteStream.getVideoTracks().some(track => track.enabled) &&
      remoteStream.getAudioTracks().some(track => track.enabled);
  
    return hasLocalTracks && hasRemoteTracks;
  };
  
  export const validateConnection = (
    pc: RTCPeerConnection | null,
    localStream: MediaStream | null,
    remoteStream: MediaStream | null
  ): boolean => {
    return Boolean(
      pc &&
      pc.connectionState === 'connected' &&
      checkStreamStatus(localStream, remoteStream)
    );
  };