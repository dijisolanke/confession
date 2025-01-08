import { useEffect, useRef, useState, useReducer } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("https://server-0w31.onrender.com");

interface RTCState {
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
  connectionState: string;
}

type RTCAction =
  | { type: "SET_MAKING_OFFER"; payload: boolean }
  | { type: "SET_IGNORE_OFFER"; payload: boolean }
  | { type: "SET_CONNECTION_STATE"; payload: string };

const initialState: RTCState = {
  makingOffer: false,
  ignoreOffer: false,
  polite: false,
  connectionState: "new",
};

function rtcReducer(state: RTCState, action: RTCAction): RTCState {
  switch (action.type) {
    case "SET_MAKING_OFFER":
      return { ...state, makingOffer: action.payload };
    case "SET_IGNORE_OFFER":
      return { ...state, ignoreOffer: action.payload };
    case "SET_CONNECTION_STATE":
      return { ...state, connectionState: action.payload };
    default:
      return state;
  }
}

const VideoChat = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [partnerAlias] = useState<string>(
    location.state?.partnerAlias || "Anonymous"
  );
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [rtcState, dispatch] = useReducer(rtcReducer, {
    ...initialState,
    polite: location.state?.isInitiator === false,
  });
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const setupMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });
      console.log("Media stream obtained:", {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Local video stream set.");
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  };

  const createPeerConnection = async (iceServers: RTCIceServer[]) => {
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
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state changed:", pc.connectionState);
        dispatch({ type: "SET_CONNECTION_STATE", payload: pc.connectionState });

        if (pc.connectionState === "failed") {
          console.log("Connection failed, closing peer connection...");
          pc.close();
          setupCall(); // Attempt to restart the call
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

  const setupCall = async () => {
    console.log("Setting up new call...");
    socket.emit("requestTurnCredentials");
  };

  const handleLeaveRoom = () => {
    if (peerConnectionRef.current) {
      socket.emit("leaveRoom");
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    // Clean up video tracks
    if (localVideoRef.current?.srcObject instanceof MediaStream) {
      localVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
    navigate("/");
  };
  useEffect(() => {
    let isComponentMounted = true;

    console.log("VideoChat mounted with:", {
      roomId,
      isInitiator: location.state?.isInitiator,
      partnerAlias,
    });

    socket.emit("requestTurnCredentials");
    console.log("Requested TURN credentials");

    socket.on("turnCredentials", async (credentials) => {
      if (!isComponentMounted) {
        console.log("Component unmounted, ignoring TURN credentials");
        return;
      }

      try {
        console.log("Received TURN credentials, beginning setup...");
        setIsLoading(true);

        //setup mediaStream
        const stream = await setupMediaStream();
        console.log("Media stream obtained:", {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });

        const pc = await createPeerConnection(credentials);
        peerConnectionRef.current = pc;
        console.log("Created peer connection");

        socket.emit("joinRoom", { roomId });
        console.log("Joined room:", roomId);

        socket.on("offer", async ({ offer, from }) => {
          if (!peerConnectionRef.current) return;
          console.log("Received offer from peer:", offer.type);

          const pc = peerConnectionRef.current;
          const offerCollision =
            rtcState.makingOffer || pc.signalingState !== "stable";

          dispatch({
            type: "SET_IGNORE_OFFER",
            payload: !rtcState.polite && offerCollision,
          });

          if (rtcState.ignoreOffer) {
            console.log("Ignoring colliding offer (impolite peer)");
            return;
          }

          try {
            if (offerCollision) {
              console.log("Handling offer collision...");
              await Promise.all([
                pc.setLocalDescription({ type: "rollback" }),
                pc.setRemoteDescription(offer),
              ]);
            } else {
              await pc.setRemoteDescription(offer);
            }

            console.log("Creating answer...");
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log("Sending answer to peer");
            socket.emit("answer", {
              answer: pc.localDescription,
              to: from,
            });
          } catch (err) {
            console.error("Error handling offer:", err);
          }
        });

        socket.on("answer", async ({ answer, from }) => {
          console.log("Received answer from:", from);
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(answer)
            );
            console.log("Set remote description from answer");
            setIsLoading(false); //might remove
          }
        });

        socket.on("ice-candidate", async ({ candidate }) => {
          try {
            if (!peerConnectionRef.current) return;
            console.log("Received ICE candidate:", candidate.candidate);
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("Successfully added ICE candidate");
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        socket.on("partnerLeft", () => {
          console.log("Partner left the room");
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
          }
        });
      } catch (error) {
        console.error("Setup failed:", error);
        setMediaError(error instanceof Error ? error.message : "Setup failed");
      }
    });

    setupCall();

    return () => {
      isComponentMounted = false;
      console.log("Cleaning up...");

      // Clean up local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log("Stopped track:", track.kind);
          localStreamRef.current = null;
        });
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

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      try {
        navigator.mediaDevices
          .getUserMedia({ audio: false, video: false })
          .catch(() => console.log("Permissions reset"));
      } catch (err) {
        console.log("Could not reset permissions");
      }

      // Remove socket listeners
      handleLeaveRoom();
      socket.off("partnerLeft");
      socket.off("turnCredentials");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.disconnect(); // Properly disconnect socket
    };
  }, [roomId, location.state?.isInitiator, navigate, partnerAlias]); //might remove partnerAlias

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-xl font-bold">Video Chat with {partnerAlias}</h1>
      {isLoading && <p>Initializing video chat...</p>}
      {mediaError && <p className="text-red-500">Error: {mediaError}</p>}
      <p className="text-sm text-gray-600">
        Connection State: {rtcState.connectionState}
      </p>
      <div className="flex gap-4">
        <div className="relative">
          <video
            controls
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-64 h-48 bg-gray-200 rounded"
          />
          <p className="absolute bottom-2 left-2 text-white text-sm">You</p>
        </div>
        <div className="relative">
          <video
            controls
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-64 h-48 bg-gray-200 rounded"
          />
          <p className="absolute bottom-2 left-2 text-white text-sm">
            {partnerAlias}
          </p>
        </div>
      </div>
      <button
        onClick={handleLeaveRoom}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Leave Chat
      </button>
    </div>
  );
};

export default VideoChat;
