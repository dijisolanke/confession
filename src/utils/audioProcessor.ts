export class AudioProcessor {
    private context: AudioContext;
    private source: MediaStreamAudioSourceNode | null = null;
    private destination: MediaStreamAudioDestinationNode | null = null;
    private pitchShifter: BiquadFilterNode | null = null;
  
    constructor() {
      // Use low latency settings
      this.context = new AudioContext({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
    }
  
    setupAudioProcessing(stream: MediaStream): MediaStream {
    
        // Ensure context is running
     if (this.context.state === 'suspended') {
        this.context.resume();
      }
      
        // Clean up any existing processing chain
      this.cleanup();
  
      // Create nodes
      this.source = this.context.createMediaStreamSource(stream);
      this.destination = this.context.createMediaStreamDestination();
      
      // Create and configure pitch shifter for a lower voice
      this.pitchShifter = this.context.createBiquadFilter();
      this.pitchShifter.type = 'lowshelf';
      this.pitchShifter.frequency.value = 500; // Base frequency
      this.pitchShifter.gain.value = 15

      // Add a second filter for additional effect
      const secondFilter = this.context.createBiquadFilter();
      secondFilter.type = 'highshelf';
      secondFilter.frequency.value = 1000;
      secondFilter.gain.value = -10;  // Reduce higher frequencies
  
      // Connect the audio processing chain
      this.source
        .connect(this.pitchShifter)
        .connect(secondFilter)
        .connect(this.destination);
  
      // Return the processed stream
      return this.destination.stream;
    }
  
    cleanup() {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.pitchShifter) {
        this.pitchShifter.disconnect();
        this.pitchShifter = null;
      }
      if (this.destination) {
        this.destination.disconnect();
        this.destination = null;
      }
    }
  }