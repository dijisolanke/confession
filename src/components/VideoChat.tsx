import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:3001"); // Replace with your server URL

const VideoChat: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [partnerAlias] = useState<string>(
    location.state?.partnerAlias || "Anonymous"
  );
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const initWebRTC = async () => {
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
        ], // Add your TURN server here
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
    };

    initWebRTC();

    socket.on("offer", async ({ offer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit("answer", { answer, to: roomId });
      }
    });

    socket.on("answer", async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    });

    socket.on("partnerLeft", () => {
      alert("Your chat partner has left the room.");
      navigate("/");
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("partnerLeft");
      peerConnectionRef.current?.close();
    };
  }, [roomId, location.state, navigate]);

  const handleLeave = () => {
    socket.emit("leaveRoom");
    navigate("/");
  };

  return (
    <div>
      <h1>Video Chat with {partnerAlias}</h1>
      <video ref={localVideoRef} autoPlay muted playsInline />
      <video ref={remoteVideoRef} autoPlay playsInline />
      <button onClick={handleLeave}>Leave Chat</button>
    </div>
  );
};

export default VideoChat;

// import { useEffect, useRef, useState } from "react";
// import { useLocation } from "react-router-dom";
// import styled from "styled-components";
// import io, { Socket } from "socket.io-client";

// const VideoChatContainer = styled.div`
//   display: flex;
//   justify-content: center;
//   align-items: center;
//   height: 100vh;
// `;
// const VideoElement = styled.video`
//   width: 400px;
//   height: 300px;
//   border: 1px solid #ccc;
// `;
// const ErrorMessage = styled.div`
//   color: red;
//   margin: 10px 0;
// `;

// interface LocationState {
//   partnerId: string;
// }
// interface RTCConfig {
//   iceServers: RTCIceServer[];
//   iceTransportPolicy: RTCIceTransportPolicy;
// }

// export default function VideoChat() {
//   const location = useLocation();
//   let partnerId = "mockPartnerId";
//   //   let { partnerId } = location.state as LocationState;
//   const [_, setSocket] = useState<Socket | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);

//   const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

//   partnerId = "mockPartnerId"; // Remove this line
//   useEffect(() => {
//     const newSocket = io("http://localhost:3001"); // Replace with your server URL
//     setSocket(newSocket);

//     const setupWebRTC = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: true,
//         });
//         if (localVideoRef.current) {
//           localVideoRef.current.srcObject = stream;
//         }

//         const configuration: RTCConfig = {
//           iceServers: [
//             { urls: "stun:stun.l.google.com:19302" },
//             ...(process.env.TURN_URL
//               ? [
//                   {
//                     urls: process.env.TURN_URL,
//                     username: process.env.TURN_USERNAME,
//                     credential: process.env.TURN_CREDENTIAL,
//                   },
//                 ]
//               : []),
//           ],
//           iceTransportPolicy: "all", // Can be 'all', 'relay', etc.
//         };
//         const peerConnection = new RTCPeerConnection(configuration);
//         peerConnectionRef.current = peerConnection;

//         stream.getTracks().forEach((track) => {
//           peerConnection.addTrack(track, stream);
//         });

//         peerConnection.ontrack = (event) => {
//           if (remoteVideoRef.current) {
//             remoteVideoRef.current.srcObject = event.streams[0];
//           }
//         };

//         peerConnection.onicecandidate = (event) => {
//           if (event.candidate) {
//             newSocket.emit("sendMagicSignal", {
//               signal: event.candidate,
//               to: partnerId,
//             });
//           }
//         };

//         peerConnection.oniceconnectionstatechange = () => {
//           if (peerConnection.iceConnectionState === "failed") {
//             setError("Connection failed. Please try again.");
//           }
//         };

//         if (partnerId) {
//           const offer = await peerConnection.createOffer();
//           await peerConnection.setLocalDescription(offer);
//           newSocket.emit("sendMagicSignal", { signal: offer, to: partnerId });
//         }

//         newSocket.on("receiveMagicSignal", async ({ signal, from }) => {
//           try {
//             if (signal.type === "offer") {
//               await peerConnection.setRemoteDescription(
//                 new RTCSessionDescription(signal)
//               );
//               const answer = await peerConnection.createAnswer();
//               await peerConnection.setLocalDescription(answer);
//               newSocket.emit("sendMagicSignal", { signal: answer, to: from });
//             } else if (signal.type === "answer") {
//               await peerConnection.setRemoteDescription(
//                 new RTCSessionDescription(signal)
//               );
//             } else if (signal.candidate) {
//               await peerConnection.addIceCandidate(new RTCIceCandidate(signal));
//             }
//           } catch (err) {
//             console.error("Error handling received signal:", err);
//             setError("An error occurred while establishing the connection.");
//           }
//         });
//       } catch (error) {
//         console.error("Error accessing media devices:", error);
//         setError(
//           "Failed to access camera or microphone. Please check your permissions."
//         );
//       }
//     };

//     setupWebRTC();

//     return () => {
//       peerConnectionRef.current?.close();
//       newSocket.disconnect();
//     };
//   }, [partnerId]);
//   return (
//     <VideoChatContainer>
//       {error && <ErrorMessage>{error}</ErrorMessage>}
//       <VideoElement ref={localVideoRef} autoPlay muted />
//       <VideoElement ref={remoteVideoRef} autoPlay />
//     </VideoChatContainer>
//   );
// }
