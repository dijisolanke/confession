import { useEffect, useRef, useState, useReducer } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";

import { Root, Overlay, VideoItem, Button } from "./StyledVidRoom";

import backgroundImage from "/china.webp";
import { Play } from "lucide-react";
import { AudioProcessor } from "../utils/audioProcessor";

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
  const [countdown, setCountdown] = useState(3);

  const [showPlayButton, setShowPlayButton] = useState(false);

  const [audioProcessor] = useState(() => new AudioProcessor());

  const handleManualPlay = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current
        .play()
        .then(() => {
          setShowPlayButton(false);
          console.log("Manual play successful");
        })
        .catch((error) => {
          console.log("Manual play failed:", error);
          setMediaError(`Manual play failed: ${error}`);
        });
    }
  };

  // const handleMediaPermissionDenied = useCallback(() => {
  //   setMediaError("Media permission denied, returning to lobby");
  //   console.log("Media permission denied, returning to lobby");
  //   const timeoutId = setTimeout(() => navigate("/"), 3000);
  //   return () => clearTimeout(timeoutId);
  // }, [navigate]);

  const retrySetup = () => {
    if (retryCount < 3 && !mediaStreamsEstablished && !isRetrying) {
      console.log(`Retrying call setup (Attempt ${retryCount + 1})...`);
      setIsRetrying(true);
      setRetryCount((prevCount) => prevCount + 1);
      setTimeout(() => {
        socket.emit("requestTurnCredentials");
        setIsRetrying(false);
      }, 2000);
    } else if (!mediaStreamsEstablished && retryCount >= 3) {
      console.log("Max retry attempts reached. Call setup failed.");
      setMediaError("Failed to establish connection after multiple attempts.");
    }
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

  const createPeerConnection = async (iceServers: RTCIceServer[]) => {
    try {
      const pc = new RTCPeerConnection({ iceServers });
      // console.log("RTCPeerConnection created with ice servers:", iceServers);

      // Add local stream tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
          // console.log("Added local track to peer connection:", {
          //   kind: track.kind,
          //   enabled: track.enabled,
          //   id: track.id,
          // });
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // console.log("Sending ICE candidate to peer");
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: roomId,
          });
        }
      };

      // Log connection state changes
      pc.oniceconnectionstatechange = () => {
        // console.log("ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected") {
          console.log("ICE connection disconnected, attempting restart...");
        }
      };

      pc.onconnectionstatechange = () => {
        // console.log("Connection state changed:", pc.connectionState);
        dispatch({ type: "SET_CONNECTION_STATE", payload: pc.connectionState });

        if (pc.connectionState === "connected") {
          setIsLoading(false);
        } else if (
          pc.connectionState === "failed" &&
          !mediaStreamsEstablished &&
          !isRetrying
        ) {
          console.log("Connection failed, closing peer connection...");
          pc.close();
          retrySetup();
        } else if (pc.connectionState === "closed") {
          navigate("/");
        }
      };

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        // console.log("Received remote track:", {
        //   kind: event.track.kind,
        //   enabled: event.track.enabled,
        //   id: event.track.id,
        // });
        if (remoteVideoRef.current && event.streams[0]) {
          // Create a new MediaStream to hold processed audio
          const processedStream = new MediaStream();

          // Add video tracks directly
          event.streams[0].getVideoTracks().forEach((track) => {
            processedStream.addTrack(track);
            console.log("Added video track:", track.id);
          });

          // Process audio tracks with fixed lower pitch
          if (event.track.kind === "audio") {
            const audioStream = new MediaStream([event.track]);
            const processedAudioStream =
              audioProcessor.setupAudioProcessing(audioStream);
            processedAudioStream.getAudioTracks().forEach((track) => {
              processedStream.addTrack(track);
            });
          }

          remoteVideoRef.current.srcObject = processedStream;
          console.log(
            "2Check for Processed stream",
            remoteVideoRef.current.srcObject
          );

          console.log("Set remote video stream:", {
            streamId: event.streams[0].id,
            tracks: event.streams[0].getTracks().length,
          });

          // Add this block to attempt autoplay
          const playPromise = remoteVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.log(
                "Autoplay was prevented. User interaction may be needed.",
                error
              );
              setShowPlayButton(true);
            });
          }
          // Ensure both streams are established before setting callEstablished
          if (
            localVideoRef.current?.srcObject instanceof MediaStream &&
            remoteVideoRef.current.srcObject instanceof MediaStream
          ) {
            const localStream = localVideoRef.current.srcObject;
            const remoteStream = remoteVideoRef.current.srcObject;

            // Verify both streams have active audio and video tracks
            const hasLocalTracks =
              localStream.getVideoTracks().some((track) => track.enabled) &&
              localStream.getAudioTracks().some((track) => track.enabled);
            const hasRemoteTracks =
              remoteStream.getVideoTracks().some((track) => track.enabled) &&
              remoteStream.getAudioTracks().some((track) => track.enabled);

            if (hasLocalTracks && hasRemoteTracks) {
              setMediaStreamsEstablished(true);
              setIsLoading(false);
              // Reset retry count since connection is successful
              setRetryCount(0);
            }
          }
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
    if (isRetrying || mediaStreamsEstablished) return;
    console.log("Setting up new call...");
    setRetryCount(0);
    setMediaStreamsEstablished(false);
    socket.emit("requestTurnCredentials");
  };

  useEffect(() => {
    if (mediaError) {
      console.log("1Media permission Check", mediaError);
      if (mediaError === "Media permission denied, returning to lobby") {
        console.log("2Media permission Check", mediaError);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      }
    }

    let isComponentMounted = true;

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
      window.location.reload();
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

        const pc = await createPeerConnection(credentials);
        peerConnectionRef.current = pc;

        socket.emit("joinRoom", { roomId });
        console.log("Joined room:", roomId);
      } catch (error) {
        console.error("Setup failed: ", error);
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
    // socket.on("mediaPermissionDenied", handleMediaPermissionDenied);

    setupCall();

    return () => {
      isComponentMounted = false;
      console.log("Cleaning up...");

      setRetryCount(0);

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

      audioProcessor.cleanup();

      // Remove socket listeners
      handleLeaveRoom();
      // socket.off("mediaPermissionDenied", handleMediaPermissionDenied);
      socket.off("partnerLeft");
      socket.off("turnCredentials");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.disconnect(); // Properly disconnect socket
    };
  }, [
    roomId,
    location.state?.isInitiator,
    navigate,
    partnerAlias,
    // handleMediaPermissionDenied,
    // mediaError,
  ]); //might remove partnerAlias

  return (
    <Root>
      <h1 className="text-xl font-bold">Video Chat with {partnerAlias}</h1>
      {isLoading && <p>Initializing video chat...</p>}
      {/* {mediaError && <p className="text-red-500">Error: {mediaError}</p>} */}
      {mediaError === "Media permission denied, returning to lobby" && (
        <p>Redirecting to lobby in {countdown} seconds...</p>
      )}
      <p className="text-sm text-gray-600">
        Connection State: {rtcState.connectionState}
      </p>
      <div className="videos-container">
        <VideoItem>
          <Overlay backgroundImage={backgroundImage} />
          <video
            // controls
            // src="/public/candle.mp4"
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-64 h-48 bg-gray-200 rounded"
          />
          <p>You</p>
        </VideoItem>

        <VideoItem>
          <Overlay backgroundImage={backgroundImage} />
          <video
            // controls
            // src="/public/sample.mp4"
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-64 h-48 bg-gray-200 rounded"
          />
          {showPlayButton && (
            <Button onClick={handleManualPlay}>
              <Play className="text-white" size={24} />
            </Button>
          )}
          <p>{partnerAlias}</p>
        </VideoItem>
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
    </Root>
  );
};

export default VideoChat;
