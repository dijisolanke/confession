import workletCode from './pitchShiftProcessor';

interface AudioProcessingOptions {
  pitchShiftAmount?: number; // in cents
}

export class AudioStreamProcessor {
  private audioContext: AudioContext | null;
  private workletNode: AudioWorkletNode | null;
  private source: MediaStreamAudioSourceNode | null;
  private destination: MediaStreamAudioDestinationNode | null;
  private isProcessing: boolean;
  private isInitialized: boolean;

  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.source = null;
    this.destination = null;
    this.isProcessing = false;
    this.isInitialized = false;
  }

  private async loadWorklet(): Promise<void> {
    if (!this.audioContext || this.isInitialized) return;

    try {
      // Create a Blob from the worklet code
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      // Load the worklet module
      await this.audioContext.audioWorklet.addModule(workletUrl);

      // Clean up
      URL.revokeObjectURL(workletUrl);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load audio worklet:', error);
      throw new Error('Failed to load audio worklet');
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create AudioContext if it doesn't exist
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Load the worklet
      await this.loadWorklet();
    } catch (error) {
      console.error('Failed to initialize audio processor:', error);
      throw error;
    }
  }

  async processStream(
    mediaStream: MediaStream,
    options: AudioProcessingOptions = {}
  ): Promise<MediaStream> {
    const { pitchShiftAmount = -400 } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    if (this.isProcessing) {
      this.disconnect();
    }

    try {
      // Create source from the media stream
      this.source = this.audioContext.createMediaStreamSource(mediaStream);

      // Create AudioWorkletNode
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pitch-shift-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1
      });

      // Set the pitch shift parameter
      const param = this.workletNode.parameters.get('pitchShift');
      if (param) {
        param.setValueAtTime(pitchShiftAmount, this.audioContext.currentTime);
      }

      // Create destination
      this.destination = this.audioContext.createMediaStreamDestination();

      // Connect the audio processing chain
      this.source.connect(this.workletNode);
      this.workletNode.connect(this.destination);

      this.isProcessing = true;

      return this.destination.stream;
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
    }
    this.isProcessing = false;
  }

  async cleanup(): Promise<void> {
    this.disconnect();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }

  setPitchShift(amount: number): void {
    if (this.workletNode && this.isProcessing) {
      const param = this.workletNode.parameters.get('pitchShift');
      if (param) {
        param.setValueAtTime(amount, this.audioContext?.currentTime || 0);
      }
    }
  }
}

// Type declarations for the WebAudio API
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}