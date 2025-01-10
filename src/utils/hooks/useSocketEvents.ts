// useSocketEvents.ts
import { useEffect, useCallback } from 'react';
import { NavigateFunction } from 'react-router-dom';
import { 
  setupSocketListeners, 
  cleanupSocketListeners,
  leaveRoom ,
  socket
} from '../socketUtils';

interface UseSocketEventsReturn {
  partnerAlias: string;
  handleLeaveRoom: () => void;
}

export const useSocketEvents = (
  roomId: string | undefined,
  peerConnection: RTCPeerConnection | null,
  navigate: NavigateFunction
): UseSocketEventsReturn => {
  const partnerAlias = 'Anonymous';

  const handleLeaveRoom = useCallback(() => {
    if (roomId) {
      leaveRoom(roomId);
    }
    cleanupSocketListeners();
    navigate('/');
  }, [roomId, navigate]);

  useEffect(() => {
    if (!roomId || !peerConnection) return;

    const handlers = {
      onTurnCredentials: () => {
        // Handled in usePeerConnection
      },
      onOffer: async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('answer', { answer, to: from });
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      },
      onAnswer: async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      },
      onIceCandidate: async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      },
      onPartnerLeft: () => {
        handleLeaveRoom();
      }
    };

    setupSocketListeners(roomId, handlers);

    return () => {
      cleanupSocketListeners();
    };
  }, [roomId, peerConnection, handleLeaveRoom]);

  return { partnerAlias, handleLeaveRoom };
};