import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("https://server-0w31.onrender.com");

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
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

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
      console.log("Media stream obtained:", stream);
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
          console.log("Added local track to peer connection:", track.kind);
        });
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          console.log("Set remote video stream:", event.streams[0]);
        }
      };

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
        console.log("ICE connection state changed to:", pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state changed to:", pc.connectionState);
      };

      return pc;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchTURNCredentials = async () => {
      try {
        console.log("Fetching TURN credentials...");
        const response = await fetch(
          `https://confessions.metered.live/api/v1/turn/credentials?apiKey=${
            import.meta.env.VITE_TURN_API || ""
          }`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch TURN credentials");
        }
        const credentials = await response.json();
        console.log("TURN credentials obtained:", credentials);
        return credentials;
      } catch (error) {
        console.warn(
          "Failed to fetch TURN credentials, falling back to STUN only:",
          error
        );
        return [{ urls: "stun:stun.relay.metered.ca:80" }];
      }
    };

    let isComponentMounted = true;

    const initialize = async () => {
      try {
        setIsLoading(true);
        console.log("Starting initialization...");

        // Setup local media stream first
        await setupMediaStream();

        // Join the room
        console.log("Joining room:", roomId);
        socket.emit("joinRoom", { roomId });

        // Only create the peer connection if we're the initiator
        if (location.state?.isInitiator) {
          const iceServers = await fetchTURNCredentials();
          peerConnectionRef.current = await createPeerConnection(iceServers);

          // Create and send offer
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          console.log("Sending offer to peer");
          socket.emit("offer", { offer, to: roomId });
        }

        setMediaError(null);
      } catch (error) {
        console.error("Initialization error:", error);
        if (isComponentMounted) {
          setMediaError(
            error instanceof Error
              ? error.message
              : "Failed to initialize video chat"
          );
        }
      } finally {
        if (isComponentMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Socket event listeners
    socket.on("offer", async ({ offer, from }) => {
      console.log("Received offer from:", from);
      try {
        if (!peerConnectionRef.current) {
          const iceServers = await fetchTURNCredentials();
          peerConnectionRef.current = await createPeerConnection(iceServers);
        }

        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        console.log("Sending answer to:", from);
        socket.emit("answer", { answer, to: from });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    socket.on("answer", async ({ answer, from }) => {
      console.log("Received answer from:", from);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log("Set remote description from answer");
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      console.log("Received ICE candidate");
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
        console.log("Added ICE candidate");
      }
    });

    return () => {
      isComponentMounted = false;
      console.log("Cleaning up...");

      // Clean up local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log("Stopped track:", track.kind);
        });
      }

      // Clean up peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        console.log("Closed peer connection");
      }

      // Remove socket listeners
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [roomId, location.state?.isInitiator]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-xl font-bold">Video Chat with {partnerAlias}</h1>
      {isLoading && <p>Initializing video chat...</p>}
      {mediaError && <p className="text-red-500">Error: {mediaError}</p>}
      <div className="flex gap-4">
        <div className="relative">
          <video
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
        onClick={() => {
          if (localVideoRef.current?.srcObject instanceof MediaStream) {
            localVideoRef.current.srcObject
              .getTracks()
              .forEach((track) => track.stop());
          }
          navigate("/");
        }}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Leave Chat
      </button>
    </div>
  );
};

export default VideoChat;
