import type { UIMessage } from "../session";
import { THEME } from "../theme";

interface Props {
  message: UIMessage;
  index: number;
}

const Message = ({ message, index }: Props) => {
  const isUser = message.role === "user";

  return (
    <box
      key={index}
      border={["left"]}
      borderColor={
        isUser ? THEME.colors.border.focus : THEME.colors.border.default
      }
      style={{
        width: "100%",
        marginBottom: 1,
        paddingLeft: 1,
      }}
    >
      <text
        fg={
          isUser ? THEME.colors.text.primary : THEME.colors.text.secondary
        }
      >
        {message.text}
      </text>
    </box>
  );
};

export default Message;
