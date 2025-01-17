// audioProcessor.ts

interface AudioProcessingOptions {
    pitchShiftAmount?: number; // in cents
  }
  
  export class AudioStreamProcessor {
    private audioContext: AudioContext | null;
    private workletNode: AudioWorkletNode | null;
    private source: MediaStreamAudioSourceNode | null;
    private destination: MediaStreamAudioDestinationNode | null;
    private isProcessing: boolean;
    private workletUrl: string | null;
  
    constructor() {
      this.audioContext = null;
      this.workletNode = null;
      this.source = null;
      this.destination = null;
      this.isProcessing = false;
      this.workletUrl = null;
      this.createWorkletUrl();
    }
  
    private createWorkletUrl(): void {
      const workletCode = `
        class PitchShiftProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.previousSample = 0;
            this.phase = 0;
            this.shift = 1;
          }
  
          static get parameterDescriptors() {
            return [{
              name: 'pitchShift',
              defaultValue: -400,
              minValue: -1200,
              maxValue: 1200,
              automationRate: 'k-rate'
            }];
          }
  
          process(inputs, outputs, parameters) {
            const input = inputs[0][0];
            const output = outputs[0][0];
  
            if (!input || !output) return true;
  
            const pitchShift = parameters.pitchShift[0];
            this.shift = 1 + (pitchShift / 1200);
  
            for (let i = 0; i < input.length; i++) {
              this.phase += this.shift;
              const fracPhase = this.phase - Math.floor(this.phase);
              const currentSample = input[i];
              output[i] = this.previousSample * (1 - fracPhase) + currentSample * fracPhase;
              this.previousSample = currentSample;
              if (this.phase >= input.length) {
                this.phase -= input.length;
              }
            }
  
            return true;
          }
        }
  
        registerProcessor('pitch-shift-processor', PitchShiftProcessor);
      `;
  
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      this.workletUrl = URL.createObjectURL(blob);
    }
  
    async initialize(): Promise<void> {
      try {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
  
        if (!this.workletUrl) {
          throw new Error('Worklet URL not created');
        }
  
        // Load the worklet module
        await this.audioContext.audioWorklet.addModule(this.workletUrl);
        
        // Clean up the URL after loading
        URL.revokeObjectURL(this.workletUrl);
        this.workletUrl = null;
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
  
      try {
        // Ensure initialization is complete before processing
        await this.initialize();
  
        if (!this.audioContext) {
          throw new Error('AudioContext not initialized');
        }
  
        if (this.isProcessing) {
          this.disconnect();
        }
  
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
      if (this.workletUrl) {
        URL.revokeObjectURL(this.workletUrl);
        this.workletUrl = null;
      }
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