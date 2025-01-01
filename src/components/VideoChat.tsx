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
    const fetchTURNCredentials = async () => {
      try {
        const response = await fetch(
          `https://confessions.metered.live/api/v1/turn/credentials?apiKey=${
            process.env.TURN_API_KEY || ""
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
        setIsLoading(true);
        console.log("Checking media devices..."); // Debug log

        // 1. First check if media devices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Media devices not supported in this browser");
        }

        // 2. Request permissions explicitly first
        await navigator.mediaDevices
          .getUserMedia({ audio: true, video: true })
          .then((stream) => {
            // Immediately stop the test stream
            stream.getTracks().forEach((track) => track.stop());
          })
          .catch((err) => {
            throw new Error(`Permission deniedaddy: ${err.message}`);
          });

        // 3. Enumerate devices after permission is granted
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("Available devices:", devices); // Debug log

        const hasVideo = devices.some((device) => device.kind === "videoinput");
        const hasAudio = devices.some((device) => device.kind === "audioinput");

        if (!hasVideo) throw new Error("No camera detected");
        if (!hasAudio) throw new Error("No microphone detected");

        // 4. Get TURN credentials
        const iceServers = await fetchTURNCredentials();
        console.log("ICE servers configured:", iceServers); // Debug log

        // 5. Create peer connection with fetched ICE servers
        peerConnectionRef.current = new RTCPeerConnection({ iceServers });

        // 6. Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });

        console.log("Stream obtained:", stream.getTracks()); // Debug log

        // 7. Display local stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log("Local video stream set"); // Debug log
        }

        // 8. Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });

        // Rest of your WebRTC setup
        peerConnectionRef.current.ontrack = (event) => {
          console.log("Remote track received:", event); // Debug log
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

        // Debug ice connection state changes
        peerConnectionRef.current.oniceconnectionstatechange = () => {
          console.log(
            "ICE connection state:",
            peerConnectionRef.current?.iceConnectionState
          );
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

  // Rest of your component remains the same...

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
