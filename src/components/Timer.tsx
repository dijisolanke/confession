import React, { useState, useEffect, useRef } from "react";

interface CountdownTimerProps {
  onTimerEnd: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ onTimerEnd }) => {
  const [timeLeft, setTimeLeft] = useState(6 * 60); // 5 minutes in seconds
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      const newTimeLeft = 6 * 60 - elapsedSeconds;

      if (newTimeLeft <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeLeft(0);
        onTimerEnd();
      } else {
        setTimeLeft(newTimeLeft);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onTimerEnd]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const timerStyle = {
    color: timeLeft <= 30 ? "red" : "#a47a54",
    margin: "auto",
  };

  return (
    <div style={timerStyle}>
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </div>
  );
};

export default CountdownTimer;
