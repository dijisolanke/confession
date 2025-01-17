// streamHandler.ts
import { AudioStreamProcessor } from './audioProcessor';


export class StreamHandler {
  private audioProcessor: AudioStreamProcessor;
  private currentStream: MediaStream | null = null;
  private processedAudioTrack: MediaStreamTrack | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private videoElement: HTMLVideoElement | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.audioProcessor = new AudioStreamProcessor();
    this.videoElement = videoElement;
  }

  async initialize(): Promise<void> {
    await this.audioProcessor.initialize();
  }

  async handleTrack(event: RTCTrackEvent): Promise<void> {
    console.log(`Handling ${event.track.kind} track:`, {
      id: event.track.id,
      enabled: event.track.enabled,
      muted: event.track.muted,
      readyState: event.track.readyState
    });

    if (!this.videoElement) {
      throw new Error('Video element not set');
    }

    try {
      if (event.track.kind === 'audio') {
        // Process audio track
        const processedStream = await this.audioProcessor.processStream(
          event.streams[0],
          { pitchShiftAmount: -400 }
        );

        this.processedAudioTrack = processedStream.getAudioTracks()[0];
        await this.updateMediaStream();
      } else if (event.track.kind === 'video') {
        // Store video track
        this.videoTrack = event.track;
        await this.updateMediaStream();
      }
    } catch (error) {
      console.error(`Error handling ${event.track.kind} track:`, error);
      // Fallback to original track
      if (event.track.kind === 'audio') {
        this.processedAudioTrack = event.track;
      } else {
        this.videoTrack = event.track;
      }
      await this.updateMediaStream();
    }
  }

  private async updateMediaStream(): Promise<void> {
    if (!this.videoElement) return;

    // Create a new stream only if we need to
    if (!this.currentStream) {
      this.currentStream = new MediaStream();
    } else {
      // Remove all existing tracks
      this.currentStream.getTracks().forEach(track => {
        this.currentStream?.removeTrack(track);
      });
    }

    // Add available tracks to the stream
    if (this.processedAudioTrack) {
      this.currentStream.addTrack(this.processedAudioTrack);
    }
    if (this.videoTrack) {
      this.currentStream.addTrack(this.videoTrack);
    }

    // Update the video element
    if (this.videoElement.srcObject !== this.currentStream) {
      this.videoElement.srcObject = this.currentStream;
      
      // Ensure audio is enabled
      this.videoElement.muted = false;
      this.videoElement.volume = 1;
      
      // Try to play the stream
      try {
        await this.videoElement.play();
        console.log('Video element is playing');
      } catch (error) {
        console.error('Error playing video element:', error);
      }
    }

    // Log current state
    console.log('Stream updated:', {
      audioTracks: this.currentStream.getAudioTracks().length,
      videoTracks: this.currentStream.getVideoTracks().length,
      videoMuted: this.videoElement.muted,
      videoVolume: this.videoElement.volume
    });
  }

  cleanup(): void {
    if (this.processedAudioTrack) {
      this.processedAudioTrack.stop();
    }
    if (this.videoTrack) {
      this.videoTrack.stop();
    }
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
    }
    this.audioProcessor.cleanup();
  }
}