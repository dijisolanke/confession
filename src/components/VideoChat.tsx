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

  const fetchTURNCredentials = async () => {
    try {
      const response = await fetch(
        `https://confessions.metered.live/api/v1/turn/credentials?apiKey=${
          import.meta.env.VITE_TURN_API || ""
        }`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch TURN credentials");
      }
      return await response.json();
    } catch (error) {
      console.warn(
        "Failed to fetch TURN credentials, falling back to STUN only:",
        error
      );
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  };

  const initWebRTC = async () => {
    try {
      console.log("Initializing WebRTC...");
      setIsLoading(true);

      // Ensure browser compatibility
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported in this browser.");
      }

      // Check media permissions
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      testStream.getTracks().forEach((track) => track.stop());

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("Available devices:", devices);

      const hasVideo = devices.some((device) => device.kind === "videoinput");
      const hasAudio = devices.some((device) => device.kind === "audioinput");
      if (!hasVideo || !hasAudio) {
        throw new Error(
          "Required media devices not detected. Please check your setup."
        );
      }

      // Fetch TURN credentials
      const iceServers = await fetchTURNCredentials();
      console.log("Using ICE servers:", iceServers);

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection({ iceServers });
      console.log("PeerConnection created.");

      // Media stream setup
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        console.log("Local video stream set.");
      }

      // Add local tracks to peer connection
      localStream
        .getTracks()
        .forEach((track) =>
          peerConnectionRef.current?.addTrack(track, localStream)
        );

      // Handle remote tracks
      peerConnectionRef.current.ontrack = (event) => {
        console.log("Remote track received:", event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate:", event.candidate);
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: roomId,
          });
        }
      };

      // Debugging peer connection state changes
      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log(
          "ICE connection state:",
          peerConnectionRef.current?.iceConnectionState
        );
      };

      // Handle signaling
      if (location.state?.isInitiator) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        console.log("Offer created and sent:", offer);
        socket.emit("offer", { offer, to: roomId });
      }

      setMediaError(null);
    } catch (error) {
      console.error("WebRTC initialization failed:", error);
      setMediaError(
        error instanceof Error
          ? error.message
          : "Failed to initialize video chat. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleSignaling = () => {
      socket.on("paired", async ({ partnerAlias }) => {
        console.log("Paired with:", partnerAlias);
        await initWebRTC();
      });

      socket.on("offer", async ({ offer, from }) => {
        console.log("Received offer:", offer);
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(offer);
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          socket.emit("answer", { answer, to: from });
        }
      });

      socket.on("answer", async ({ answer }) => {
        console.log("Received answer:", answer);
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(answer);
        }
      });

      socket.on("ice-candidate", async ({ candidate }) => {
        console.log("Received ICE candidate:", candidate);
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
      });

      socket.on("partnerLeft", () => {
        alert("Your partner has left the chat.");
        navigate("/");
      });
    };

    handleSignaling();

    return () => {
      socket.off("paired");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("partnerLeft");

      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        localVideoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
      peerConnectionRef.current?.close();
    };
  }, [roomId, location.state, navigate]);

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
        onClick={() => navigate("/")}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Leave Chat
      </button>
    </div>
  );
};

export default VideoChat;
