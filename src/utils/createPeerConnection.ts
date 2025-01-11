// utils/createPeerConnection.ts

import { Dispatch } from 'react';
import { NavigateFunction } from 'react-router-dom';
import { Socket } from 'socket.io-client';

type RTCAction =
  | { type: "SET_MAKING_OFFER"; payload: boolean }
  | { type: "SET_IGNORE_OFFER"; payload: boolean }
  | { type: "SET_CONNECTION_STATE"; payload: string };

interface CreatePeerConnectionParams {
  iceServers: RTCIceServer[];
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  socket: Socket;
  roomId: string;
  dispatch: Dispatch<RTCAction>;
  setIsLoading: (loading: boolean) => void;
  setMediaStreamsEstablished: (established: boolean) => void;
  navigate: NavigateFunction;
  retrySetup: () => void;
  mediaStreamsEstablished: boolean;
  isRetrying: boolean;
  setRetryCount: (count: number) => void;
}

export const createPeerConnection = async ({
  iceServers,
  localStreamRef,
  remoteVideoRef,
  localVideoRef,
  socket,
  roomId,
  dispatch,
  setIsLoading,
  setMediaStreamsEstablished,
  navigate,
  retrySetup,
  mediaStreamsEstablished,
  isRetrying,
  setRetryCount
}: CreatePeerConnectionParams): Promise<RTCPeerConnection> => {
  try {
    const pc = new RTCPeerConnection({ iceServers });
    console.log("RTCPeerConnection created with ice servers:", iceServers);

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
        console.log("Added local track to peer connection:", {
          kind: track.kind,
          enabled: track.enabled,
          id: track.id,
        });
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to peer");
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: roomId,
        });
      }
    };

    // Log connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected") {
        console.log("ICE connection disconnected, attempting restart...");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state changed:", pc.connectionState);
      dispatch({ type: "SET_CONNECTION_STATE", payload: pc.connectionState });

      if (pc.connectionState === "connected") {
        setIsLoading(false);
      } else if (
        pc.connectionState === "failed" &&
        !mediaStreamsEstablished &&
        !isRetrying
      ) {
        console.log("Connection failed, closing peer connection...");
        pc.close();
        retrySetup();
      } else if (pc.connectionState === "closed") {
        navigate("/");
      }
    };

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log("Received remote track:", {
        kind: event.track.kind,
        enabled: event.track.enabled,
        id: event.track.id,
      });
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log("Set remote video stream:", {
          streamId: event.streams[0].id,
          tracks: event.streams[0].getTracks().length,
        });
        // Ensure both streams are established before setting callEstablished
        if (
          localVideoRef.current?.srcObject instanceof MediaStream &&
          remoteVideoRef.current.srcObject instanceof MediaStream
        ) {
          const localStream = localVideoRef.current.srcObject;
          const remoteStream = remoteVideoRef.current.srcObject;

          // Verify both streams have active audio and video tracks
          const hasLocalTracks =
            localStream.getVideoTracks().some((track) => track.enabled) &&
            localStream.getAudioTracks().some((track) => track.enabled);
          const hasRemoteTracks =
            remoteStream.getVideoTracks().some((track) => track.enabled) &&
            remoteStream.getAudioTracks().some((track) => track.enabled);

          if (hasLocalTracks && hasRemoteTracks) {
            setMediaStreamsEstablished(true);
            setIsLoading(false);
            // Reset retry count since connection is successful
            setRetryCount(0);
          }
        }
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        dispatch({ type: "SET_MAKING_OFFER", payload: true });
        await pc.setLocalDescription();
        socket.emit("offer", {
          offer: pc.localDescription,
          to: roomId,
        });
      } catch (err) {
        console.error(err);
      } finally {
        dispatch({ type: "SET_MAKING_OFFER", payload: false });
      }
    };

    return pc;
  } catch (error) {
    console.error("Error creating peer connection:", error);
    throw error;
  }
};