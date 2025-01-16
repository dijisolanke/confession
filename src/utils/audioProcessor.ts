export class AudioProcessor {
    private context: AudioContext ;
    private source: MediaStreamAudioSourceNode | null = null;
    private destination: MediaStreamAudioDestinationNode | null = null;
    private pitchShifter: BiquadFilterNode | null = null;
  
    constructor() {
      // Use low latency settings
      // this.context = new AudioContext({
      //   latencyHint: 'interactive',
      //   sampleRate: 48000
      // });
      this.context = new AudioContext();
    }
  

    public resumeContext() {
        if (this.context?.state === 'suspended') {
        this.context.resume();
        }
    }

    setupAudioProcessing(stream: MediaStream): MediaStream {
      console.log("Setting up audio processing");
      // Clean up any existing processing chain
      this.cleanup();
  
      try {
        this.source = this.context.createMediaStreamSource(stream);
        this.destination = this.context.createMediaStreamDestination();
        
        this.pitchShifter = this.context.createBiquadFilter();
        this.pitchShifter.type = 'lowshelf';
        this.pitchShifter.frequency.value = 500;
        this.pitchShifter.gain.value = 15;
  
        // Simpler connection chain
        this.source.connect(this.pitchShifter);
        this.pitchShifter.connect(this.destination);
  
        console.log("Audio processing chain setup complete");
        return this.destination.stream;
      } catch (error) {
        console.error("Error in audio processing setup:", error);
        return stream; // Return original stream if processing fails
      }
    }
  
    cleanup() {
      console.log("Cleaning up audio processor");
      if (this.source) this.source.disconnect();
      if (this.pitchShifter) this.pitchShifter.disconnect();
      if (this.destination) this.destination.disconnect();
      
      this.source = null;
      this.pitchShifter = null;
      this.destination = null;
    }
  }