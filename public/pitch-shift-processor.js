// pitch-shift-processor.js - Enhanced version with audio cleanup
class PitchShiftProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = 2048;
    this.hopSize = 512;
    this.overlapFactor = 4;
    this.pitchShift = 0.75;

    // Buffers for STFT processing
    this.inputBuffer = new Float32Array(this.frameSize * 2);
    this.outputBuffer = new Float32Array(this.frameSize * 2);
    this.overlapBuffer = new Float32Array(this.frameSize);

    // FFT setup (simplified implementation)
    this.fftSize = this.frameSize;
    this.analysisWindow = this.createWindow(this.frameSize);
    this.synthesisWindow = this.createWindow(this.frameSize);

    // Phase vocoder state
    this.lastPhase = new Float32Array(this.fftSize / 2 + 1);
    this.sumPhase = new Float32Array(this.fftSize / 2 + 1);

    // Audio enhancement parameters
    this.noiseGate = 0.01; // Noise gate threshold
    this.compressorRatio = 3.0;
    this.compressorThreshold = 0.7;
    this.highpassFreq = 80; // Remove low frequency rumble

    // Simple filters
    this.highpass = { x1: 0, x2: 0, y1: 0, y2: 0 };
    this.lowpass = { x1: 0, x2: 0, y1: 0, y2: 0 };

    this.writeIndex = 0;
    this.readIndex = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === "setPitchShift") {
        this.pitchShift = Math.max(0.5, Math.min(2.0, event.data.value));
      }
    };
  }

  createWindow(size) {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      // Hann window for smooth overlap
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  // Simple highpass filter to remove low-frequency noise
  highpassFilter(input) {
    // Simple 2nd order highpass at ~80Hz (assuming 44.1kHz sample rate)
    const a = 0.99;
    const b = (1 - a) / 2;

    const output =
      b * (input - 2 * this.highpass.x1 + this.highpass.x2) +
      a * (2 * this.highpass.y1 - this.highpass.y2);

    this.highpass.x2 = this.highpass.x1;
    this.highpass.x1 = input;
    this.highpass.y2 = this.highpass.y1;
    this.highpass.y1 = output;

    return output;
  }

  // Simple lowpass filter for anti-aliasing
  lowpassFilter(input) {
    // Simple lowpass to reduce harsh artifacts
    const alpha = 0.85;
    this.lowpass.y1 = alpha * this.lowpass.y1 + (1 - alpha) * input;
    return this.lowpass.y1;
  }

  // Noise gate to reduce background noise
  applyNoiseGate(input) {
    const absInput = Math.abs(input);
    if (absInput < this.noiseGate) {
      return input * (absInput / this.noiseGate) * 0.1; // Gradual gate
    }
    return input;
  }

  // Simple compressor to even out dynamics
  applyCompressor(input) {
    const absInput = Math.abs(input);
    if (absInput > this.compressorThreshold) {
      const excess = absInput - this.compressorThreshold;
      const compressedExcess = excess / this.compressorRatio;
      const newLevel = this.compressorThreshold + compressedExcess;
      return input * (newLevel / absInput);
    }
    return input;
  }

  // Improved pitch shifting using overlap-add with crossfading
  pitchShiftFrame(inputData, outputData) {
    const frameSize = inputData.length;

    // Fill input buffer
    for (let i = 0; i < frameSize; i++) {
      this.inputBuffer[this.writeIndex] = inputData[i];
      this.writeIndex = (this.writeIndex + 1) % (this.frameSize * 2);
    }

    // Process with overlap-add
    for (let i = 0; i < frameSize; i++) {
      let output = 0;

      // Multiple overlapping grains for smoother result
      for (let grain = 0; grain < this.overlapFactor; grain++) {
        const grainOffset = grain * this.hopSize;
        const readPos = (this.readIndex + grainOffset) * this.pitchShift;
        const readPosInt = Math.floor(readPos) % (this.frameSize * 2);
        const readPosFrac = readPos - Math.floor(readPos);

        // Linear interpolation with bounds checking
        const sample1 = this.inputBuffer[readPosInt] || 0;
        const sample2 =
          this.inputBuffer[(readPosInt + 1) % (this.frameSize * 2)] || 0;

        const interpolated =
          sample1 * (1 - readPosFrac) + sample2 * readPosFrac;

        // Window the grain to avoid clicks
        const windowPos = (i + grainOffset) % this.frameSize;
        const windowValue = this.analysisWindow[windowPos] || 0;

        output += (interpolated * windowValue) / this.overlapFactor;
      }

      // Add overlap from previous frame
      output += this.overlapBuffer[i] * 0.5;

      // Store current frame for next overlap
      if (i < this.overlapBuffer.length) {
        this.overlapBuffer[i] = output * 0.5;
      }

      outputData[i] = output;
      this.readIndex = (this.readIndex + 1) % (this.frameSize * 2);
    }
  }

  // Main audio enhancement chain
  enhanceAudio(inputData, outputData) {
    // First apply pitch shifting
    this.pitchShiftFrame(inputData, outputData);

    // Then apply audio cleanup
    for (let i = 0; i < outputData.length; i++) {
      let sample = outputData[i];

      // Audio enhancement chain
      sample = this.highpassFilter(sample); // Remove low-freq noise
      sample = this.applyNoiseGate(sample); // Gate background noise
      sample = this.applyCompressor(sample); // Even out dynamics
      sample = this.lowpassFilter(sample); // Anti-aliasing

      // Soft limiting to prevent clipping
      sample = Math.tanh(sample * 0.8) * 0.9;

      outputData[i] = sample;
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length > 0 && output.length > 0) {
      for (
        let channel = 0;
        channel < Math.min(input.length, output.length);
        channel++
      ) {
        const inputChannel = input[channel];
        const outputChannel = output[channel];

        if (inputChannel && outputChannel && inputChannel.length > 0) {
          this.enhanceAudio(inputChannel, outputChannel);
        }
      }
    }

    return true;
  }
}

registerProcessor("pitch-shift-processor", PitchShiftProcessor);
