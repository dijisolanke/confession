// webRTCManager.ts

import { MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';

interface WebRTCManagerConfig {
  maxRetries?: number;
  retryDelay?: number;
  connectionTimeout?: number;
}

interface SetupCallParams {
  socket: Socket;
  roomId: string;
  peerConnectionRef: MutableRefObject<RTCPeerConnection | null>;
  localStreamRef: MutableRefObject<MediaStream | null>;
  onStateChange?: (state: string) => void;
  onError?: (error: string) => void;
  onLoading?: (loading: boolean) => void;
}

class WebRTCManager {
  private maxRetries: number;
  private retryDelay: number;
  private connectionTimeout: number;

  constructor(config: WebRTCManagerConfig = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 2000;
    this.connectionTimeout = config.connectionTimeout || 10000;
  }

  private async setupMediaStream(): Promise<MediaStream> {
    try {
      console.log("Attempting to access media devices...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });
      
      console.log("Media stream obtained successfully", {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });
      
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }

  private async createPeerConnection(
    iceServers: RTCIceServer[],
    socket: Socket,
    roomId: string,
    localStream: MediaStream
  ): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({ iceServers });

    // Add tracks to peer connection
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
      console.log("Added track to peer connection:", {
        kind: track.kind,
        enabled: track.enabled,
        id: track.id,
      });
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Generated ICE candidate:", event.candidate.candidate);
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: roomId,
        });
      }
    };

    return pc;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async setupCallWithRetry({
    socket,
    roomId,
    peerConnectionRef,
    localStreamRef,
    onStateChange = () => {},
    onError = () => {},
    onLoading = () => {},
  }: SetupCallParams, retryCount = 0): Promise<void> {
    try {
      console.log(`Attempting call setup (attempt ${retryCount + 1}/${this.maxRetries})`);
      onLoading(true);

      // Clean up existing connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Setup media stream
      const stream = await this.setupMediaStream();
      localStreamRef.current = stream;

      // Wait for TURN credentials
      return new Promise((resolve, reject) => {
        const turnTimeout = setTimeout(() => {
          reject(new Error("TURN credentials timeout"));
        }, this.connectionTimeout);

        socket.once("turnCredentials", async (credentials) => {
          clearTimeout(turnTimeout);
          
          try {
            const pc = await this.createPeerConnection(credentials, socket, roomId, stream);
            peerConnectionRef.current = pc;

            // Setup connection state monitoring
            pc.onconnectionstatechange = () => {
              const state = pc.connectionState;
              console.log("Connection state changed:", state);
              onStateChange(state);

              if (state === 'connected') {
                onLoading(false);
                resolve();
              } else if (state === 'failed') {
                reject(new Error("Connection failed"));
              }
            };

            // Join room after setup
            socket.emit("joinRoom", { roomId });

          } catch (error) {
            reject(error);
          }
        });

        // Request TURN credentials
        socket.emit("requestTurnCredentials");
      });

    } catch (error) {
      console.error(`Call setup attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount < this.maxRetries - 1) {
        console.log(`Retrying in ${this.retryDelay/1000} seconds...`);
        await this.delay(this.retryDelay);
        return this.setupCallWithRetry({
          socket,
          roomId,
          peerConnectionRef,
          localStreamRef,
          onStateChange,
          onError,
          onLoading,
        }, retryCount + 1);
      } else {
        onError("Failed to establish connection after multiple attempts");
        onLoading(false);
        throw new Error("Max retries exceeded");
      }
    }
  }

  public cleanup(peerConnectionRef: MutableRefObject<RTCPeerConnection | null>, localStreamRef: MutableRefObject<MediaStream | null>): void {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log("Closed peer connection");
    }
  }
}

export default WebRTCManager;