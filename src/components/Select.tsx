import { useKeyboard } from "@opentui/react";
import { THEME } from "../theme";

export interface SelectItem {
  key: string;
  label: string;
  detail?: string;
}

interface Props {
  items: SelectItem[];
  active: boolean;
  selectedIndex: number;
  onSelectedChange: (index: number) => void;
  emptyText?: string;
}

const Select = ({
  items,
  active,
  selectedIndex,
  onSelectedChange,
  emptyText = "No items",
}: Props) => {
  useKeyboard((key) => {
    if (!active || items.length === 0) return;
    if (key.name === "up") {
      onSelectedChange(Math.max(0, selectedIndex - 1));
    } else if (key.name === "down") {
      onSelectedChange(Math.min(items.length - 1, selectedIndex + 1));
    }
  });

  return (
    <scrollbox>
      {items.map((item, i) => {
        const isSelected = active && i === selectedIndex;
        return (
          <box
            key={item.key}
            style={{ flexDirection: "row" }}
            backgroundColor={
              isSelected ? THEME.colors.bg.secondary : undefined
            }
          >
            <text
              style={{ flexGrow: 1 }}
              fg={
                isSelected
                  ? THEME.colors.text.primary
                  : THEME.colors.text.secondary
              }
            >
              {isSelected ? "> " : "  "}
              {item.label}
            </text>
            {item.detail && (
              <text fg={THEME.colors.text.muted}> {item.detail}</text>
            )}
          </box>
        );
      })}
      {items.length === 0 && (
        <text fg={THEME.colors.text.muted}>{emptyText}</text>
      )}
    </scrollbox>
  );
};

export default Select;
