import { useRef } from "react";
import {
  type SelectRenderable,
  type SelectOption,
} from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ToolUseRequest } from "../session";
import type { Session } from "../session";
import type { ToolInputMap } from "../tools";
import { THEME } from "../theme";

const toolUseRequestOptions: SelectOption[] = [
  { name: "Yes", description: "", value: "yes" },
  {
    name: "No",
    description: "",
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
    diffContent = session.fileMemory.computeEditDiff(input as ToolInputMap["edit"]);
  } else if (toolName === "write") {
    diffContent = session.fileMemory.computeWriteDiff(input as ToolInputMap["write"]);
  }

  return (
    <box
      borderColor={THEME.colors.border.default}
      style={{ padding: 1 }}
      border={["left"]}
    >
      <text style={{ marginTop: 1 }}>{`${toolName} ${description}`}</text>
      {diffContent && <diff diff={diffContent} showLineNumbers={true} />}
      <select
        style={{ height: 6, marginTop: 1 }}
        options={toolUseRequestOptions}
        focused={false}
        ref={selectRef}
      />
    </box>
  );
};

export default ToolUseRequestDialog;
