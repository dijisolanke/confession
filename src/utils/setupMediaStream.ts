export const setupMediaStream = async (): Promise<MediaStream> => {
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
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  };
  