export class AudioProcessor {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private pitchShifter: BiquadFilterNode | null = null;

  setupAudioProcessing(stream: MediaStream): MediaStream {
      console.log("Setting up audio processing");
      console.log('streams',stream.getAudioTracks().length);
      
      try {
          // Create new context only when processing
          if (!this.context || this.context.state === 'closed') {
              this.context = new AudioContext({
                  latencyHint: 'interactive',
                  sampleRate: 48000
              });
          }

          // Resume context if suspended
          if (this.context.state === 'suspended') {
              this.context.resume();
          }

          this.source = this.context.createMediaStreamSource(stream);
          this.destination = this.context.createMediaStreamDestination();
          
          // Create a more dramatic pitch shift effect
          this.pitchShifter = this.context.createBiquadFilter();
          this.pitchShifter.type = 'lowshelf';
          this.pitchShifter.frequency.value = 100; // Lower frequency for more dramatic effect
          this.pitchShifter.gain.value = 25; // Increased gain
          
          // Connect the audio processing chain
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
      try {
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
          if (this.context) {
              this.context.close();
              this.context = null;
          }
      } catch (error) {
          console.error("Error during cleanup:", error);
      }
  }
}