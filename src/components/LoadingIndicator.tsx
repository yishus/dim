import { useEffect, useState } from "react";
import { THEME } from "../theme";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const LoadingIndicator = () => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <box style={{ flexDirection: "row", marginTop: 1 }}>
      <text fg={THEME.colors.highlight.warning}>
        {SPINNER_FRAMES[frame]}{" "}
      </text>
      <text fg={THEME.colors.text.muted}>Thinking...</text>
    </box>
  );
};

export default LoadingIndicator;
