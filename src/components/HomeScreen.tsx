import ChatTextbox from "./ChatTextbox";
import { THEME } from "../theme";

interface Props {
  initialPromptSubmitted: (prompt: string) => void;
  onExit: () => void;
  warning?: string;
}

const HomeScreen = (props: Props) => {
  const { initialPromptSubmitted, onExit, warning } = props;

  const handleSubmit = (submittedText: string) => {
    if (submittedText === "/exit" || submittedText === "exit") {
      onExit();
      return;
    }
    initialPromptSubmitted(submittedText);
  };

  return (
    <box
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
      }}
    >
      <box
        style={{
          justifyContent: "center",
          alignItems: "center",
          minWidth: 60,
          width: "50%",
        }}
      >
        <ascii-font font="tiny" text="dim" style={{ marginBottom: 1 }} />

        {warning && (
          <text fg={THEME.colors.highlight.warning} style={{ marginBottom: 1 }}>
            {warning}
          </text>
        )}

        <ChatTextbox onSubmit={handleSubmit} minHeight={2} />
      </box>
    </box>
  );
};

export default HomeScreen;
