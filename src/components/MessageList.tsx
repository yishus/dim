import type { UIMessage } from "../types";
import Message from "./Message";

interface Props {
  messages: UIMessage[];
}

const MessageList = ({ messages }: Props) => (
  <>
    {messages
      .filter((message) => message.text)
      .map((message, index) => (
        <Message key={index} message={message} index={index} />
      ))}
  </>
);

export default MessageList;
