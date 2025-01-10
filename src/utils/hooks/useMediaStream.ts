// useMediaStream.ts
import { useState, useEffect, RefObject } from 'react';
import { 
  setupMediaStream, 
  cleanupMediaStream, 
  attachStreamToVideo,
  type MediaStreamError 
} from '../mediaStreamUtils';

interface UseMediaStreamReturn {
  localStream: MediaStream | null;
  mediaError: string | null;
  isLoadingMedia: boolean;
}

export const useMediaStream = (
  localVideoRef: RefObject<HTMLVideoElement>
): UseMediaStreamReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeMediaStream = async () => {
      try {
        setIsLoadingMedia(true);
        const stream = await setupMediaStream();
        
        if (mounted) {
          setLocalStream(stream);
          attachStreamToVideo(localVideoRef, stream, true);
          setMediaError(null);
        }
      } catch (error) {
        if (mounted) {
          console.error('Media stream setup failed:', error);
          setMediaError((error as MediaStreamError).message || 'Failed to access media devices');
        }
      } finally {
        if (mounted) {
          setIsLoadingMedia(false);
        }
      }
    };

    initializeMediaStream();

    return () => {
      mounted = false;
      if (localStream) {
        cleanupMediaStream(localStream);
        setLocalStream(null);
      }
    };
  }, [localVideoRef]);

  return { localStream, mediaError, isLoadingMedia };
};