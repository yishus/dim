import { useRef } from "react";
import {
  type SelectRenderable,
  type SelectOption,
  createTextAttributes,
} from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { ALL_MODELS, Provider, type ModelId } from "../session";
import { PROVIDER_DISPLAY_NAMES } from "../providers";
import { THEME } from "../theme";

const modelOptions: SelectOption[] = ALL_MODELS.map((m) => ({
  name: `${m.name} (${PROVIDER_DISPLAY_NAMES[m.provider]})`,
  description: m.id,
  value: `${m.provider}:${m.id}`,
}));

const boldAttr = createTextAttributes({ bold: true });

interface Props {
  currentModel: ModelId;
  onSelect: (model: ModelId, provider: Provider) => void;
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
        const [provider, model] = selectedValue.split(":");
        onSelect(model as ModelId, provider as Provider);
      }
      return;
    }
    if (key.name === "escape") {
      onCancel();
    }
  });

  const currentModelName =
    ALL_MODELS.find((m) => m.id === currentModel)?.name ?? "Unknown";

  return (
    <box
      border={true}
      borderColor={THEME.colors.border.default}
      backgroundColor={THEME.colors.bg.secondary}
      style={{ maxWidth: 100 }}
    >
      <text attributes={boldAttr}>Select Model</text>
      <text fg={THEME.colors.text.muted}>Current: {currentModelName}</text>
      <box border={["top", "bottom"]} borderColor={THEME.colors.border.default}>
        <select
          style={{ height: 6 }}
          options={modelOptions}
          focused={false}
          ref={selectRef}
        />
      </box>
      <text fg={THEME.colors.text.muted}>
        Enter to select, Escape to cancel
      </text>
    </box>
  );
};

export default ModelSelectorDialog;
