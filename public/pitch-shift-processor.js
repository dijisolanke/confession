// pitch-shift-processor.js
class PitchShiftProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.hopSize = 1024;
    this.pitchShift = 0.75; // Lower = deeper voice, Higher = higher voice
    this.overlapBuffer = new Float32Array(this.bufferSize);
    this.inputBuffer = new Float32Array(this.bufferSize);
    this.outputBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.grainSize = 2048;

    // Listen for pitch shift changes from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === "setPitchShift") {
        this.pitchShift = event.data.value;
      }
    };
  }

  // Simple pitch shifting using overlap-add with time-domain stretching
  pitchShiftSample(inputData, outputData) {
    const inputLength = inputData.length;

    for (let i = 0; i < inputLength; i++) {
      this.inputBuffer[this.writeIndex] = inputData[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }

    for (let i = 0; i < inputLength; i++) {
      // Read from buffer with pitch shift rate
      const readPos = this.readIndex * this.pitchShift;
      const readPosInt = Math.floor(readPos);
      const readPosFrac = readPos - readPosInt;

      // Linear interpolation
      const sample1 = this.inputBuffer[readPosInt % this.bufferSize];
      const sample2 = this.inputBuffer[(readPosInt + 1) % this.bufferSize];

      outputData[i] = sample1 * (1 - readPosFrac) + sample2 * readPosFrac;

      this.readIndex = (this.readIndex + 1) % this.bufferSize;
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
          this.pitchShiftSample(inputChannel, outputChannel);
        }
      }
    }

    return true;
  }
}

registerProcessor("pitch-shift-processor", PitchShiftProcessor);
