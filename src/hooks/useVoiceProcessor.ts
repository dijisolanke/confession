import { useRef, useCallback, useEffect } from "react";

// Type declarations for AudioContext and AudioWorkletNode
type Nullable<T> = T | null;

type UseVoiceProcessorReturn = {
  initializeAudioWorklet: () => Promise<boolean>;
  processMediaStream: (mediaStream: MediaStream) => Promise<MediaStream>;
  setPitchShift: (value: number) => void;
  cleanup: () => void;
  isProcessing: boolean;
};

const useVoiceProcessor = (): UseVoiceProcessorReturn => {
  const audioContextRef = useRef<Nullable<AudioContext>>(null);
  const workletRef = useRef<Nullable<AudioWorkletNode>>(null);
  const sourceRef = useRef<Nullable<MediaStreamAudioSourceNode>>(null);
  const destinationRef =
    useRef<Nullable<MediaStreamAudioDestinationNode>>(null);
  const isProcessingRef = useRef<boolean>(false);

  const initializeAudioWorklet = useCallback(async (): Promise<boolean> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)({
          sampleRate: 44100,
          latencyHint: "interactive",
        });
      }

      const audioContext = audioContextRef.current;

      if (!audioContext) throw new Error("AudioContext not initialized");

      // Resume context if suspended (required for user interaction)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Load the audio worklet processor
      await audioContext.audioWorklet.addModule("/pitch-shift-processor.js");

      // Create the worklet node
      workletRef.current = new AudioWorkletNode(
        audioContext,
        "pitch-shift-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
        }
      );

      console.log("Audio worklet initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize audio worklet:", error);
      return false;
    }
  }, []);

  const processMediaStream = useCallback(
    async (mediaStream: MediaStream): Promise<MediaStream> => {
      if (
        !audioContextRef.current ||
        !workletRef.current ||
        isProcessingRef.current
      ) {
        console.log("Audio worklet not ready or already processing");
        return mediaStream;
      }

      try {
        const audioContext = audioContextRef.current;

        // Create source from media stream
        sourceRef.current = audioContext!.createMediaStreamSource(mediaStream);

        // Create destination for processed audio
        destinationRef.current = audioContext!.createMediaStreamDestination();

        // Connect: source -> worklet -> destination
        sourceRef.current.connect(workletRef.current);
        workletRef.current.connect(destinationRef.current);

        // Create new stream with processed audio and original video
        const processedAudioStream = destinationRef.current.stream;
        const videoTracks = mediaStream.getVideoTracks();
        const processedAudioTracks = processedAudioStream.getAudioTracks();

        // Create combined stream
        const combinedStream = new MediaStream([
          ...videoTracks,
          ...processedAudioTracks,
        ]);

        isProcessingRef.current = true;
        console.log("Media stream processing started");

        return combinedStream;
      } catch (error) {
        console.error("Failed to process media stream:", error);
        return mediaStream; // Return original stream if processing fails
      }
    },
    []
  );

  const setPitchShift = useCallback((value: number) => {
    if (workletRef.current) {
      workletRef.current.port.postMessage({
        type: "setPitchShift",
        value: value,
      });
    }
  }, []);

  const cleanup = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    isProcessingRef.current = false;
    console.log("Voice processor cleaned up");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    initializeAudioWorklet,
    processMediaStream,
    setPitchShift,
    cleanup,
    isProcessing: isProcessingRef.current,
  };
};

export default useVoiceProcessor;
