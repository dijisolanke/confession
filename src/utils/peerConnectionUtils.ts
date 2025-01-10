export interface PeerConnectionConfig {
    iceServers: RTCIceServer[];
  }
  
  export const createPeerConnection = async (
    config: PeerConnectionConfig,
    localStream: MediaStream | null,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (event: RTCTrackEvent) => void,
    onConnectionStateChange: (state: RTCPeerConnectionState) => void
  ): Promise<RTCPeerConnection> => {
    try {
      const pc = new RTCPeerConnection(config);
      console.log("RTCPeerConnection created with config:", config);
  
      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
          console.log("Added local track:", {
            kind: track.kind,
            enabled: track.enabled,
            id: track.id,
          });
        });
      }
  
      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          onIceCandidate(event.candidate);
        }
      };
  
      pc.ontrack = onTrack;
      
      pc.onconnectionstatechange = () => {
        console.log("Connection state changed:", pc.connectionState);
        onConnectionStateChange(pc.connectionState);
      };
  
      return pc;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      throw error;
    }
  };
  
  export const handleNegotiation = async (
    pc: RTCPeerConnection,
    onOffer: (offer: RTCSessionDescriptionInit) => void
  ): Promise<void> => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      onOffer(offer);
    } catch (error) {
      console.error("Error during negotiation:", error);
      throw error;
    }
  };
  
  export const cleanupPeerConnection = (pc: RTCPeerConnection | null): void => {
    if (!pc) return;
  
    // Close all transceivers
    pc.getTransceivers().forEach((transceiver) => {
      if (transceiver.stop) {
        transceiver.stop();
      }
    });
  
    pc.close();
  };