import { THEME } from "../theme";

interface Props {
  providerName: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

const StatusBar = ({
  providerName,
  modelName,
  inputTokens,
  outputTokens,
  cost,
}: Props) => (
  <box
    style={{
      flexDirection: "row",
    }}
  >
    <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
      Provider
    </text>
    <text fg={THEME.colors.text.primary} style={{ marginRight: 1 }}>
      {providerName}
    </text>

    <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
      Model
    </text>
    <text fg={THEME.colors.text.primary} style={{ marginRight: 1 }}>
      {modelName}
    </text>

    <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
      Input Tokens
    </text>
    <text fg={THEME.colors.text.primary} style={{ marginRight: 1 }}>
      {inputTokens}
    </text>

    <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
      Output Tokens
    </text>
    <text fg={THEME.colors.text.primary} style={{ marginRight: 1 }}>
      {outputTokens}
    </text>

    <text fg={THEME.colors.text.muted} style={{ marginRight: 1 }}>
      Total Cost
    </text>
    <text fg={THEME.colors.text.primary}>${cost.toFixed(6)}</text>
  </box>
);

export default StatusBar;
