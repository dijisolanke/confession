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
      // Clean up any existing processing chain
      this.cleanup();
  
      // Create nodes
      this.source = this.context.createMediaStreamSource(stream);
      this.destination = this.context.createMediaStreamDestination();
      
      // Create and configure pitch shifter for a lower voice
      this.pitchShifter = this.context.createBiquadFilter();
      this.pitchShifter.type = 'highpass';
      this.pitchShifter.frequency.value = 1000; // Base frequency
      this.pitchShifter.Q.value = 1; // Quality factor
      this.pitchShifter.detune.value = -700; // Lower pitch by 7 semitones
  
      // Connect the audio processing chain
      this.source
        .connect(this.pitchShifter)
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