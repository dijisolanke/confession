import React from "react";
import { Mic, MicOff } from "lucide-react";

type VoiceControlsProps = {
  voiceProcessingEnabled: boolean;
  setVoiceProcessingEnabled: (enabled: boolean) => void;
  pitchLevel: number;
  handlePitchChange: (value: number) => void;
  disabled?: boolean;
};

const VoiceControls: React.FC<VoiceControlsProps> = ({
  voiceProcessingEnabled,
  setVoiceProcessingEnabled,
  pitchLevel,
  handlePitchChange,
  disabled = false,
}) => {
  const pitchPresets: { label: string; value: number }[] = [
    { label: "Very Deep", value: 0.5 },
    { label: "Deep", value: 0.75 },
    { label: "Normal", value: 1.0 },
    { label: "High", value: 1.25 },
    { label: "Very High", value: 1.5 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        background: "rgba(0, 0, 0, 0.8)",
        padding: "15px",
        borderRadius: "10px",
        color: "white",
        minWidth: "200px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          onClick={() => setVoiceProcessingEnabled(!voiceProcessingEnabled)}
          disabled={disabled}
          style={{
            background: voiceProcessingEnabled ? "#22c55e" : "#ef4444",
            border: "none",
            borderRadius: "5px",
            padding: "8px 12px",
            color: "white",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {voiceProcessingEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          {voiceProcessingEnabled ? "Voice Masking ON" : "Voice Masking OFF"}
        </button>
      </div>

      {voiceProcessingEnabled && (
        <>
          <div style={{ marginBottom: "10px", fontSize: "14px" }}>
            Voice Pitch: {pitchLevel.toFixed(2)}
          </div>

          <div style={{ marginBottom: "15px" }}>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={pitchLevel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handlePitchChange(parseFloat(e.target.value))
              }
              disabled={disabled}
              style={{
                width: "100%",
                opacity: disabled ? 0.5 : 1,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                marginTop: "5px",
                color: "#ccc",
              }}
            >
              <span>Deep</span>
              <span>Normal</span>
              <span>High</span>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {pitchPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePitchChange(preset.value)}
                disabled={disabled}
                style={{
                  background:
                    pitchLevel === preset.value
                      ? "#3b82f6"
                      : "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "3px",
                  padding: "4px 8px",
                  color: "white",
                  fontSize: "12px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceControls;
