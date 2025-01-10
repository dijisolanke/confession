
export interface MediaStreamConfig {
    video?: {
      width?: { ideal: number };
      height?: { ideal: number };
      facingMode?: string;
    };
    audio?: boolean;
  }
  
  export interface MediaStreamError extends Error {
    name: string;
    message: string;
  }
  
  const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConfig = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    },
    audio: true,
  };
  
  export const setupMediaStream = async (
    constraints: MediaStreamConfig = DEFAULT_MEDIA_CONSTRAINTS
  ): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Media stream obtained:", {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  };
  
  export const cleanupMediaStream = (stream: MediaStream | null): void => {
    if (!stream) return;
    
    stream.getTracks().forEach((track) => {
      track.stop();
      console.log("Stopped track:", track.kind);
    });
  };
  
  export const resetMediaPermissions = async (): Promise<void> => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: false, video: false });
    } catch (err) {
      console.log("Could not reset permissions");
    }
  };
  
  export const attachStreamToVideo = (
    videoRef: React.RefObject<HTMLVideoElement>,
    stream: MediaStream | null,
    isMuted: boolean = false
  ): void => {
    if (!videoRef.current || !stream) return;
    
    videoRef.current.srcObject = stream;
    videoRef.current.muted = isMuted;
  };