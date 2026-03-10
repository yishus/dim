import { useEffect, useRef } from "react";
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
  multiSelect?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
}

const Select = ({
  items,
  active,
  selectedIndex,
  onSelectedChange,
  emptyText = "No items",
  multiSelect = false,
  selectedKeys = [],
  onSelectionChange,
}: Props) => {
  const scrollRef = useRef<any>(null);
  const showSelection = !!onSelectionChange;
  const selectedSet = new Set(selectedKeys);

  useKeyboard((key) => {
    if (!active || items.length === 0) return;
    if (key.name === "up") {
      onSelectedChange(Math.max(0, selectedIndex - 1));
    } else if (key.name === "down") {
      onSelectedChange(Math.min(items.length - 1, selectedIndex + 1));
    } else if (
      showSelection &&
      (key.name === "space" || key.name === "return")
    ) {
      const item = items[selectedIndex];
      if (!item) return;
      if (multiSelect) {
        const next = new Set(selectedSet);
        if (next.has(item.key)) {
          next.delete(item.key);
        } else {
          next.add(item.key);
        }
        onSelectionChange([...next]);
      } else {
        onSelectionChange(
          selectedSet.has(item.key) ? [] : [item.key],
        );
      }
    }
  });

  useEffect(() => {
    const sb = scrollRef.current;
    if (!sb) return;
    const viewportHeight = sb.viewport?.height ?? 0;
    if (viewportHeight === 0) return;
    const scrollTop = sb.scrollTop ?? 0;
    if (selectedIndex < scrollTop) {
      sb.scrollTo(selectedIndex);
    } else if (selectedIndex >= scrollTop + viewportHeight) {
      sb.scrollTo(selectedIndex - viewportHeight + 1);
    }
  }, [selectedIndex]);

  return (
    <scrollbox ref={scrollRef} style={{ flexGrow: 1, minHeight: 0 }}>
      {items.map((item, i) => {
        const isHighlighted =
          active && i === selectedIndex;
        const isChecked = selectedSet.has(item.key);
        const checkbox = isChecked ? "[x] " : "[ ] ";
        return (
          <box
            key={item.key}
            style={{ flexDirection: "row" }}
            backgroundColor={
              isHighlighted ? THEME.colors.bg.secondary : undefined
            }
          >
            {showSelection && (
              <text
                fg={
                  isChecked
                    ? THEME.colors.text.primary
                    : THEME.colors.text.muted
                }
              >
                {checkbox}
              </text>
            )}
            <text
              style={{ flexGrow: 1 }}
              fg={
                isHighlighted
                  ? THEME.colors.text.primary
                  : THEME.colors.text.secondary
              }
            >
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
