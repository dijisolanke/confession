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
        return [{ urls: "stun:stun.l.google.com:19302" }];
      }
    };

    const initWebRTC = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing WebRTC...");

        // 1. Check media devices
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Media devices not supported in this browser");
        }
        console.log("Media devices API available.");

        // 2. Request media permissions
        await navigator.mediaDevices
          .getUserMedia({ audio: true, video: true })
          .then((stream) => {
            console.log("Media permissions granted.");
            stream.getTracks().forEach((track) => track.stop());
          })
          .catch((err) => {
            console.error("Media permissions denied:", err);
            throw new Error(`Permission error: ${err.message}`);
          });

        // 3. Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("Devices available:", devices);

        const hasVideo = devices.some((device) => device.kind === "videoinput");
        const hasAudio = devices.some((device) => device.kind === "audioinput");

        if (!hasVideo) throw new Error("No camera detected");
        if (!hasAudio) throw new Error("No microphone detected");

        // 4. Fetch TURN credentials
        const iceServers = await fetchTURNCredentials();
        console.log("ICE servers configured:", iceServers);

        // 5. Create peer connection
        peerConnectionRef.current = new RTCPeerConnection({ iceServers });
        console.log("RTCPeerConnection created.");

        // 6. Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });
        console.log("Media stream obtained:", stream);

        // 7. Set local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log("Local video stream set.");
        }

        // 8. Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
          console.log("Track added to peer connection:", track);
        });

        // 9. Configure peer connection events
        peerConnectionRef.current.ontrack = (event) => {
          console.log("Remote track received:", event);
          console.log("Remote track received:", event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            console.log("Remote video stream set.");
          }
        };

        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("ICE candidate generated:", event.candidate);
            socket.emit("ice-candidate", {
              candidate: event.candidate,
              to: roomId,
            });
          }
        };

        peerConnectionRef.current.oniceconnectionstatechange = () => {
          console.log(
            "ICE connection state:",
            peerConnectionRef.current?.iceConnectionState
          );
        };

        if (location.state?.isInitiator) {
          console.log("Creating offer...");
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          console.log("Offer created and sent:", offer);
          socket.emit("offer", { offer, to: roomId });
        }

        setMediaError(null);
      } catch (error) {
        console.error("WebRTC initialization error:", error);
        setMediaError(
          error instanceof Error
            ? error.message
            : "Failed to access camera or microphone. Please check your permissions."
        );
      } finally {
        setIsLoading(false);
      }
    };

    socket.on("paired", async ({ partnerAlias, roomId }) => {
      console.log("Paired with partner:", partnerAlias, "in room:", roomId);
      socket.emit("joinRoom", { roomId });
      await initWebRTC();
    });

    socket.on("offer", async ({ offer, from }) => {
      console.log("Received offer from:", from);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        console.log("Answer created and sent:", answer);
        socket.emit("answer", { answer, to: from });
      }
    });

    socket.on("answer", async ({ answer, from }) => {
      console.log("Received answer from:", from);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log("Answer set as remote description.");
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      console.log("Received ICE candidate:", candidate);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
        console.log("ICE candidate added.");
      }
    });

    socket.on("partnerLeft", () => {
      console.warn("Your chat partner has left the room.");
      alert("Your chat partner has left the room.");
      navigate("/");
    });

    initWebRTC();

    return () => {
      console.log("Cleaning up resources...");
      socket.off("paired");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("partnerLeft");

      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => {
          console.log("Stopping local track:", track);
          track.stop();
        });
      }
      peerConnectionRef.current?.close();
      console.log("Peer connection closed.");
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
