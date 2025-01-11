// import { NavigateFunction } from "react-router-dom";
import { Socket } from "socket.io-client";
import { NavigateFunction } from "react-router-dom";

interface HandleLeaveProps{
    peerConnection: React.MutableRefObject<RTCPeerConnection | null>;
    socket: Socket;
    localVideoRef: React.RefObject<HTMLVideoElement>,
    navigate: NavigateFunction
}

export const handleLeaveRoom = ({peerConnection, socket, localVideoRef, navigate}:HandleLeaveProps ) => {
    if (peerConnection?.current) {
      socket.emit("leaveRoom");
      peerConnection.current.close();
      peerConnection.current = null;
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