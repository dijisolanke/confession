import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import WebRTCManager from "../utils/webRTCManager";

const socket = io("https://server-0w31.onrender.com");

const webRTCManager = new WebRTCManager({
  maxRetries: 3,
  retryDelay: 2000,
  connectionTimeout: 10000,
});

const VideoChat = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [partnerAlias] = useState<string>(
    location.state?.partnerAlias || "Anonymous"
  );
  const [connectionState, setConnectionState] = useState<string>("new");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const setupCall = async () => {
      try {
        await webRTCManager.setupCallWithRetry({
          socket,
          roomId: roomId!,
          peerConnectionRef,
          localStreamRef,
          localVideoRef,
          remoteVideoRef,
          onStateChange: setConnectionState,
          onError: setMediaError,
          onLoading: setIsLoading,
        });

        // Set local video stream
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      } catch (error) {
        console.error("Call setup failed:", error);
        setMediaError("Failed to establish connection");
      }
    };

    setupCall();

    return () => {
      webRTCManager.cleanup(peerConnectionRef, localStreamRef);
      socket.emit("leaveRoom");
      socket.disconnect();
    };
  }, [roomId]); //might remove partnerAlias.. might add location.state?.isInitiator, navigate, partnerAlias

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-xl font-bold">Video Chat with {partnerAlias}</h1>
      {isLoading && <p>Initializing video chat...</p>}
      {mediaError && <p className="text-red-500">Error: {mediaError}</p>}
      <p className="text-sm text-gray-600">
        Connection State: {connectionState}
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
        onClick={() => {
          if (localVideoRef.current?.srcObject instanceof MediaStream) {
            localVideoRef.current.srcObject
              .getTracks()
              .forEach((track) => track.stop());
          }
          socket.emit("leaveRoom"); // Add this line
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
