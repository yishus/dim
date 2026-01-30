import { useRef } from "react";
import type { SelectRenderable, SelectOption } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ToolUseRequest } from "../session";
import type { Session } from "../session";
import type { ToolInputMap } from "../tools";

const toolUseRequestOptions: SelectOption[] = [
  { name: "Yes", description: "Allow agent to use tool", value: "yes" },
  {
    name: "No",
    description: "Disallow agent's request to use tool",
    value: "no",
  },
];

interface Props {
  request: ToolUseRequest;
  session: Session;
  onSelect: (approved: boolean) => void;
}

const ToolUseRequestDialog = ({ request, session, onSelect }: Props) => {
  const selectRef = useRef<SelectRenderable>(null);

  useKeyboard((key) => {
    if (key.name === "down") {
      selectRef.current?.moveDown();
      return;
    }
    if (key.name === "up") {
      selectRef.current?.moveUp();
      return;
    }
    if (key.name === "return") {
      const selectedValue = selectRef.current?.getSelectedOption()?.value;
      onSelect(selectedValue === "yes");
    }
  });

  const { toolName, description, input } = request;
  let diffContent;
  if (toolName === "edit") {
    diffContent = session.computeEditDiff(input as ToolInputMap["edit"]);
  } else if (toolName === "write") {
    diffContent = session.computeWriteDiff(input as ToolInputMap["write"]);
  }

  return (
    <>
      <text>{`${toolName} ${description}`}</text>
      {diffContent && <diff diff={diffContent} showLineNumbers={true} />}
      <select
        style={{ height: 6 }}
        options={toolUseRequestOptions}
        focused={false}
        ref={selectRef}
      />
    </>
  );
};

export default ToolUseRequestDialog;
