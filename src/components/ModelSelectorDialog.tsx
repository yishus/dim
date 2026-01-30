import { useRef } from "react";
import type { SelectRenderable, SelectOption } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { AVAILABLE_MODELS, type ModelId } from "../session";

const modelOptions: SelectOption[] = AVAILABLE_MODELS.map((m) => ({
  name: m.name,
  description: m.id,
  value: m.id,
}));

interface Props {
  currentModel: ModelId;
  onSelect: (model: ModelId) => void;
  onCancel: () => void;
}

const ModelSelectorDialog = ({ currentModel, onSelect, onCancel }: Props) => {
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
      if (selectedValue) {
        onSelect(selectedValue as ModelId);
      }
      return;
    }
    if (key.name === "escape") {
      onCancel();
    }
  });

  const currentModelName =
    AVAILABLE_MODELS.find((m) => m.id === currentModel)?.name ?? "Unknown";

  return (
    <box style={{ border: true, padding: 1 }}>
      <text style={{ marginBottom: 1 }}>
        Select model (current: {currentModelName})
      </text>
      <select
        style={{ height: 4 }}
        options={modelOptions}
        focused={false}
        ref={selectRef}
      />
      <text style={{ marginTop: 1 }}>
        Press Enter to select, Escape to cancel
      </text>
    </box>
  );
};

export default ModelSelectorDialog;
