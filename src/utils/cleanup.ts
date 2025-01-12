// utils/cleanup.ts

import type { Socket } from 'socket.io-client';

interface CleanupParams {
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  peerConnectionRef: React.MutableRefObject<RTCPeerConnection | null>;
  socket: Socket;
  setRetryCount: (count: number) => void;
}

export const cleanupVideoChat = ({
  localStreamRef,
  remoteVideoRef,
  localVideoRef,
  peerConnectionRef,
  socket,
  setRetryCount,
}: CleanupParams) => {
  console.log("Cleaning up...");

  setRetryCount(0);

  // Clean up local stream
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach((track) => {
      track.stop();
      console.log("Stopped track:", track.kind);
    });
    localStreamRef.current = null;
  }

  // Clean up remote stream
  if (
    remoteVideoRef.current &&
    remoteVideoRef.current.srcObject instanceof MediaStream
  ) {
    const remoteStream = remoteVideoRef.current.srcObject;
    remoteStream.getTracks().forEach((track) => {
      track.stop();
      console.log("Stopped remote track:", track.kind);
    });
    remoteVideoRef.current.srcObject = null;
  }

  // Clean up peer connection
  if (peerConnectionRef.current) {
    // Close all peer connection transceivers
    peerConnectionRef.current.getTransceivers().forEach((transceiver) => {
      if (transceiver.stop) {
        transceiver.stop();
      }
    });

    // Close the peer connection
    peerConnectionRef.current.close();
    peerConnectionRef.current = null;
  }

  // Clean up video refs
  if (localVideoRef.current) {
    localVideoRef.current.srcObject = null;
  }
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = null;
  }

  // Reset permissions
  try {
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: false })
      .catch(() => console.log("Permissions reset"));
  } catch (err) {
    console.log("Could not reset permissions");
  }

  // Remove socket listeners
  socket.off("partnerLeft");
  socket.off("turnCredentials");
  socket.off("offer");
  socket.off("answer");
  socket.off("ice-candidate");
  socket.disconnect(); // Properly disconnect socket
};