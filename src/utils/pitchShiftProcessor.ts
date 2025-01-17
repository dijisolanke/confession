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

export default workletCode;