import type { UIMessage } from "../session";

interface Props {
  message: UIMessage;
  index: number;
}

const Message = ({ message, index }: Props) => {
  if (message.role === "user") {
    return (
      <box key={index} style={{ width: "100%", border: true }}>
        <text>{message.text}</text>
      </box>
    );
  }
  return <text key={index}>{message.text}</text>;
};

export default Message;
