// usePeerConnection.ts
import { useState, useEffect, useRef, RefObject } from 'react';
import { 
  createPeerConnection,
  cleanupPeerConnection,
  handleNegotiation 
} from '../peerConnectionUtils';
import { socket, emitSocketEvent } from '../socketUtils';
import { attachStreamToVideo } from '../mediaStreamUtils';

interface UsePeerConnectionReturn {
  peerConnection: RTCPeerConnection | null;
  connectionState: RTCPeerConnectionState;
  isLoadingPeer: boolean;
}

export const usePeerConnection = (
  localStream: MediaStream | null,
  remoteVideoRef: RefObject<HTMLVideoElement>
): UsePeerConnectionReturn => {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isLoadingPeer, setIsLoadingPeer] = useState(true);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!localStream) return;

    const handleIceCandidate = (candidate: RTCIceCandidate) => {
      emitSocketEvent('ice-candidate', { candidate });
    };

    const handleTrack = (event: RTCTrackEvent) => {
      if (remoteVideoRef.current && event.streams[0]) {
        attachStreamToVideo(remoteVideoRef, event.streams[0]);
      }
    };

    const handleConnectionStateChange = (state: RTCPeerConnectionState) => {
      setConnectionState(state);
      setIsLoadingPeer(state !== 'connected');
    };

    socket.on('turnCredentials', async (iceServers: RTCIceServer[]) => {
      try {
        const pc = await createPeerConnection(
          { iceServers },
          localStream,
          handleIceCandidate,
          handleTrack,
          handleConnectionStateChange
        );
        
        peerConnectionRef.current = pc;
        
        // Set up negotiation handler
        pc.onnegotiationneeded = () => {
          handleNegotiation(pc, (offer) => {
            emitSocketEvent('offer', { offer });
          });
        };
      } catch (error) {
        console.error('Failed to create peer connection:', error);
        setIsLoadingPeer(false);
      }
    });

    return () => {
      if (peerConnectionRef.current) {
        cleanupPeerConnection(peerConnectionRef.current);
        peerConnectionRef.current = null;
      }
    };
  }, [localStream, remoteVideoRef]);

  return {
    peerConnection: peerConnectionRef.current,
    connectionState,
    isLoadingPeer
  };
};