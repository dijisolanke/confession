import { useRef, useCallback, useEffect } from "react";

// Utility type for nullable values
type Nullable<T> = T | null;

type UseVoiceProcessorReturn = {
  initializeAudioWorklet: () => Promise<boolean>;
  processMediaStream: (mediaStream: MediaStream) => Promise<MediaStream>;
  setPitchShift: (value: number) => void;
  cleanup: () => void;
  isProcessing: boolean;
};

export const useVoiceProcessor = (): UseVoiceProcessorReturn => {
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
          // @ts-ignore
          window.webkitAudioContext)({
          sampleRate: 48000,
          latencyHint: "interactive",
        });
      }

      const audioContext = audioContextRef.current!;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      await audioContext.audioWorklet.addModule("/pitch-shift-processor.js");
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
        const audioContext = audioContextRef.current!;

        // Create source from media stream
        sourceRef.current = audioContext.createMediaStreamSource(mediaStream);

        // Add pre-processing: dynamics compressor for better input
        const preCompressor = audioContext.createDynamicsCompressor();
        preCompressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        preCompressor.knee.setValueAtTime(30, audioContext.currentTime);
        preCompressor.ratio.setValueAtTime(3, audioContext.currentTime);
        preCompressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        preCompressor.release.setValueAtTime(0.25, audioContext.currentTime);

        // Add gain control for level management
        const inputGain = audioContext.createGain();
        inputGain.gain.setValueAtTime(1.2, audioContext.currentTime);

        const outputGain = audioContext.createGain();
        outputGain.gain.setValueAtTime(1.8, audioContext.currentTime);

        // Create destination for processed audio
        destinationRef.current = audioContext.createMediaStreamDestination();

        // Connect: source -> compressor -> gain -> worklet -> output gain -> destination
        sourceRef.current.connect(preCompressor);
        preCompressor.connect(inputGain);
        inputGain.connect(workletRef.current);
        workletRef.current.connect(outputGain);
        outputGain.connect(destinationRef.current);

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
        console.log("Enhanced media stream processing started");

        return combinedStream;
      } catch (error) {
        console.error("Failed to process media stream:", error);
        return mediaStream;
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
