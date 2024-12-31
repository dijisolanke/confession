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

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        setIsLoading(true);
        // First check if media devices are available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Media devices not supported in this browser");
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some((device) => device.kind === "videoinput");
        const hasAudio = devices.some((device) => device.kind === "audioinput");

        if (!hasVideo) {
          throw new Error("No camera detected");
        }
        if (!hasAudio) {
          throw new Error("No microphone detected");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        peerConnectionRef.current = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            ...(process.env.TURN_URL
              ? [
                  {
                    urls: process.env.TURN_URL,
                    username: process.env.TURN_USERNAME,
                    credential: process.env.TURN_CREDENTIAL,
                  },
                ]
              : []),
          ],
        });

        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });

        peerConnectionRef.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              candidate: event.candidate,
              to: roomId,
            });
          }
        };

        if (location.state?.isInitiator) {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit("offer", { offer, to: roomId });
        }

        setMediaError(null);
      } catch (error) {
        console.error("Failed to initialize WebRTC:", error);
        setMediaError(
          error instanceof Error
            ? error.message
            : "Failed to access camera or microphone. Please check your permissions."
        );
      } finally {
        setIsLoading(false);
      }
    };

    initWebRTC();

    return () => {
      // Cleanup: stop all tracks
      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        localVideoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
      peerConnectionRef.current?.close();
    };
  }, [roomId, location.state, navigate]);

  const handleLeave = () => {
    // Stop all tracks before leaving
    if (localVideoRef.current?.srcObject instanceof MediaStream) {
      localVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
    socket.emit("leaveRoom");
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Initializing video chat...</p>
      </div>
    );
  }

  if (mediaError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-500">Error: {mediaError}</div>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-xl font-bold">Video Chat with {partnerAlias}</h1>
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
        onClick={handleLeave}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Leave Chat
      </button>
    </div>
  );
};

export default VideoChat;
