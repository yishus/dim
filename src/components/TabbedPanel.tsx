import { useKeyboard } from "@opentui/react";
import { THEME } from "../theme";
import type { TitleSegment } from "./StyledBox";
import type { ReactNode } from "react";

export interface Tab {
  key: string;
  label: string;
}

interface TabbedPanelProps {
  shortcutKey: string;
  tabs: Tab[];
  active: boolean;
  activeTab: string;
  onTabChange?: (tab: string) => void;
  style?: Record<string, unknown>;
  children: ReactNode;
}

const TabbedPanel = ({
  shortcutKey,
  tabs,
  active,
  activeTab,
  onTabChange,
  style,
  children,
}: TabbedPanelProps) => {
  useKeyboard((key) => {
    if (!active || tabs.length <= 1 || !onTabChange) return;
    if (key.name === "]") {
      const idx = tabs.findIndex((t) => t.key === activeTab);
      onTabChange(tabs[(idx + 1) % tabs.length]!.key);
    } else if (key.name === "[") {
      const idx = tabs.findIndex((t) => t.key === activeTab);
      onTabChange(tabs[(idx - 1 + tabs.length) % tabs.length]!.key);
    }
  });

  const titleSegments: TitleSegment[] = [
    {
      text: `[${shortcutKey}]`,
      fg: active ? THEME.colors.border.active : undefined,
      bold: true,
    },
    ...tabs.map((tab) => ({
      text: ` ${tab.label}`,
      fg:
        tabs.length > 1 && activeTab === tab.key
          ? THEME.colors.border.active
          : tabs.length > 1
            ? THEME.colors.text.muted
            : undefined,
      bold: tabs.length > 1 && activeTab === tab.key,
    })),
  ];

  return (
    <styled-box
      border={true}
      borderStyle="rounded"
      borderColor={active ? THEME.colors.border.active : undefined}
      titleSegments={titleSegments}
      style={style}
    >
      {children}
    </styled-box>
  );
};

export default TabbedPanel;
