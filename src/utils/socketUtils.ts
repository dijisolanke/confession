// socketUtils.ts
import io, { Socket } from 'socket.io-client';

export const SOCKET_SERVER_URL = "https://server-0w31.onrender.com";

export const socket: Socket = io(SOCKET_SERVER_URL);

export interface SocketMessage {
  to?: string;
  from?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export const emitSocketEvent = (
  eventName: string,
  data: SocketMessage
): void => {
  console.log(`Emitting ${eventName}:`, data);
  socket.emit(eventName, data);
};

export const setupSocketListeners = (
  roomId: string,
  handlers: {
    onTurnCredentials: (credentials: RTCIceServer[]) => void;
    onOffer: (data: { offer: RTCSessionDescriptionInit; from: string }) => void;
    onAnswer: (data: { answer: RTCSessionDescriptionInit; from: string }) => void;
    onIceCandidate: (data: { candidate: RTCIceCandidateInit }) => void;
    onPartnerLeft: () => void;
  }
): void => {
  socket.on("turnCredentials", handlers.onTurnCredentials);
  socket.on("offer", handlers.onOffer);
  socket.on("answer", handlers.onAnswer);
  socket.on("ice-candidate", handlers.onIceCandidate);
  socket.on("partnerLeft", handlers.onPartnerLeft);

  // Join room
  socket.emit("joinRoom", { roomId });
};

export const cleanupSocketListeners = (): void => {
  socket.off("turnCredentials");
  socket.off("offer");
  socket.off("answer");
  socket.off("ice-candidate");
  socket.off("partnerLeft");
  socket.disconnect();
};

export const leaveRoom = (roomId: string): void => {
  socket.emit("leaveRoom", { roomId });
};