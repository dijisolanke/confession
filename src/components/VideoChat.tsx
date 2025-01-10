import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Removed useLocation
import { useMediaStream } from "../utils/hooks/useMediaStream";
import { usePeerConnection } from "../utils/hooks/usePeerConnection";
import { useSocketEvents } from "../utils/hooks/useSocketEvents";
import { useConnectionState } from "../utils/hooks/useConnectionState";

const VideoChat = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Custom hooks encapsulate all the complex logic
  const { localStream, mediaError, isLoadingMedia } =
    useMediaStream(localVideoRef);

  const { peerConnection, connectionState, isLoadingPeer } = usePeerConnection(
    localStream,
    remoteVideoRef
  );

  const { partnerAlias, handleLeaveRoom } = useSocketEvents(
    roomId,
    peerConnection,
    navigate
  );

  const { retryCount, isRetrying, mediaStreamsEstablished, handleRetry } =
    useConnectionState(peerConnection);

  // Unified loading state
  const isLoading = isLoadingMedia || isLoadingPeer || isRetrying;

  useEffect(() => {
    return () => {
      handleLeaveRoom();
    };
  }, [handleLeaveRoom]);

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
        onClick={handleLeaveRoom}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Leave Chat
      </button>
    </div>
  );
};

export default VideoChat;
