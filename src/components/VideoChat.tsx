import { useEffect, useRef, useState, useReducer } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { handleRetrySetup } from "../utils/retrySetup";
import { handleLeaveRoom } from "../utils/leaveHandler";
import { createPeerConnection } from "../utils/createPeerConnection";
import { cleanupVideoChat } from "../utils/cleanup";

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
  const [retryCount, setRetryCount] = useState(0);
  const [mediaStreamsEstablished, setMediaStreamsEstablished] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const retrySetup = () => {
    handleRetrySetup({
      socket,
      mediaStreamsEstablished,
      isRetrying,
      retryCount,
      onRetryStart: () => setIsRetrying(true),
      onRetryEnd: () => setIsRetrying(false),
      onMaxRetriesReached: (message) => setMediaError(message),
      setRetryCount,
    });
  };

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

  const setupCall = async () => {
    if (isRetrying || mediaStreamsEstablished) return;
    console.log("Setting up new call...");
    setRetryCount(0);
    setMediaStreamsEstablished(false);
    socket.emit("requestTurnCredentials");
  };

  useEffect(() => {
    let isComponentMounted = true;

    const leaveChat = () => {
      handleLeaveRoom({
        peerConnection: peerConnectionRef,
        socket,
        localVideoRef,
        navigate,
      });
    };

    console.log("VideoChat mounted with:", {
      roomId,
      isInitiator: location.state?.isInitiator,
      partnerAlias,
    });

    const handleTurnCredentials = async (credentials: RTCIceServer[]) => {
      if (!isComponentMounted || mediaStreamsEstablished) {
        console.log(
          "Ignoring TURN credentials - component unmounted or call established"
        );
        return;
      }

      try {
        console.log("Received TURN credentials, beginning setup...");
        setIsLoading(true);

        const stream = await setupMediaStream();
        localStreamRef.current = stream; // This line was missing

        console.log("Media stream obtained:", {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });

        const pc = await createPeerConnection({
          iceServers: credentials,
          localStreamRef,
          remoteVideoRef,
          localVideoRef,
          socket,
          roomId: roomId!, // Add ! since roomId is from useParams
          dispatch,
          setIsLoading,
          setMediaStreamsEstablished,
          navigate,
          retrySetup,
          mediaStreamsEstablished,
          isRetrying,
          setRetryCount,
        });
        peerConnectionRef.current = pc;

        socket.emit("joinRoom", { roomId });
        console.log("Joined room:", roomId);
      } catch (error) {
        console.error("Setup failed:", error);
        setMediaError(error instanceof Error ? error.message : "Setup failed");
        retrySetup();
      }
    };

    const handleOffer = async ({
      offer,
      from,
    }: {
      offer: RTCSessionDescriptionInit;
      from: string;
    }) => {
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
        console.error("Setup failed:", err);
        setMediaError(err instanceof Error ? err.message : "Setup failed");
        if (!mediaStreamsEstablished) {
          retrySetup();
        }
      }
    };

    const handleAnswer = async ({
      answer,
      from,
    }: {
      answer: RTCSessionDescriptionInit;
      from: string;
    }) => {
      console.log("Received answer from:", from);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log("Set remote description from answer");
        setIsLoading(false);
      }
    };

    const handleIceCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
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
    };

    const handlePartnerLeft = () => {
      console.log("Partner left the room");
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      navigate("/");
      window.location.reload();
      console.log("page reloaded!");
    };

    socket.emit("requestTurnCredentials");
    console.log("Requested TURN credentials");

    socket.on("turnCredentials", handleTurnCredentials);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("partnerLeft", handlePartnerLeft);

    setupCall();

    return () => {
      isComponentMounted = false;
      cleanupVideoChat({
        localStreamRef,
        remoteVideoRef,
        localVideoRef,
        peerConnectionRef,
        socket,
        setRetryCount,
      });
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
        onClick={() => {
          if (localVideoRef.current?.srcObject instanceof MediaStream) {
            localVideoRef.current.srcObject
              .getTracks()
              .forEach((track) => track.stop());
          }
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
          }
          socket.emit("leaveRoom"); // Add this line
          navigate("/");
          window.location.reload();
        }}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Leave Chat
      </button>
    </div>
  );
};

export default VideoChat;
