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
  const [isConnected, setIsConnected] = useState(false);
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
      if (!response.ok) throw new Error("Failed to fetch TURN credentials");
      return await response.json();
    } catch (error) {
      console.warn("Falling back to STUN only:", error);
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  };

  const initWebRTC = async () => {
    try {
      setIsLoading(true);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Media devices not supported");
      }

      // Test permissions
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      testStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!devices.some((d) => d.kind === "videoinput"))
        throw new Error("No camera found");
      if (!devices.some((d) => d.kind === "audioinput"))
        throw new Error("No microphone found");

      const iceServers = await fetchTURNCredentials();
      peerConnectionRef.current = new RTCPeerConnection({ iceServers });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnected(true);
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

      peerConnectionRef.current.oniceconnectionstatechange = () => {
        if (peerConnectionRef.current?.iceConnectionState === "failed") {
          console.log("Connection failed, attempting restart...");
          peerConnectionRef.current.restartIce();
        }
      };

      setMediaError(null);
      return true;
    } catch (error) {
      console.error("WebRTC init failed:", error);
      setMediaError(
        error instanceof Error ? error.message : "Media access failed"
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const connect = async () => {
      const success = await initWebRTC();
      if (success) socket.emit("ready", { roomId });
    };

    let connectionTimeout: NodeJS.Timeout;

    socket.on("paired", async ({ partnerAlias, roomId }) => {
      console.log("Paired in room:", roomId);
      socket.emit("joinRoom", { roomId });
      await connect();

      connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          setMediaError("Connection timeout - please try again");
          navigate("/");
        }
      }, 30000);

      if (location.state?.isInitiator) {
        const offer = await peerConnectionRef.current?.createOffer();
        await peerConnectionRef.current?.setLocalDescription(offer);
        socket.emit("offer", { offer, to: roomId });
      }
    });

    socket.on("offer", async ({ offer, from }) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit("answer", { answer, to: from });
      } catch (error) {
        console.error("Offer handling failed:", error);
      }
    });

    socket.on("answer", async ({ answer }) => {
      try {
        await peerConnectionRef.current?.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error("Answer handling failed:", error);
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await peerConnectionRef.current?.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error("ICE candidate failed:", error);
      }
    });

    socket.on("partnerLeft", () => {
      alert("Your chat partner has left");
      navigate("/");
    });

    return () => {
      clearTimeout(connectionTimeout);
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
      socket.disconnect();
    };
  }, [roomId, location.state, navigate, isConnected]);
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
