import { parseColor } from "@opentui/core";

export const THEME = {
  colors: {
    border: {
      default: "#444444",
      focus: "#888888",
      active: "#FFA500",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#AAAAAA",
      highlight: "#FFA500",
      muted: "#666666",
    },
    bg: {
      secondary: "#111111",
    },
    highlight: {
      path: "#00AAFF", // file paths
      command: "#FFD700", // bash commands
      code: "#C792EA", // inline code
      error: "#FF6B6B", // errors
      success: "#4ADE80", // success messages
      warning: "#FBBF24", // warnings
    },
  },
};

export const githubDark = {
  keyword: { fg: parseColor("#FF7B72"), bold: true },
  string: { fg: parseColor("#A5D6FF") },
  comment: { fg: parseColor("#8B949E"), italic: true },
  number: { fg: parseColor("#79C0FF") },
  function: { fg: parseColor("#D2A8FF") },
  type: { fg: parseColor("#FFA657") },
  operator: { fg: parseColor("#FF7B72") },
  variable: { fg: parseColor("#E6EDF3") },
  property: { fg: parseColor("#79C0FF") },
  "punctuation.bracket": { fg: parseColor("#F0F6FC") },
  "punctuation.delimiter": { fg: parseColor("#C9D1D9") },
  "markup.heading": { fg: parseColor("#58A6FF"), bold: true },
  "markup.heading.1": {
    fg: parseColor("#00FF88"),
    bold: true,
    underline: true,
  },
  "markup.heading.2": { fg: parseColor("#00D7FF"), bold: true },
  "markup.heading.3": { fg: parseColor("#FF69B4") },
  "markup.bold": { fg: parseColor("#F0F6FC"), bold: true },
  "markup.strong": { fg: parseColor("#F0F6FC"), bold: true },
  "markup.italic": { fg: parseColor("#F0F6FC"), italic: true },
  "markup.list": { fg: parseColor("#FF7B72") },
  "markup.quote": { fg: parseColor("#8B949E"), italic: true },
  "markup.raw": { fg: parseColor("#A5D6FF"), bg: parseColor("#161B22") },
  "markup.raw.block": { fg: parseColor("#A5D6FF"), bg: parseColor("#161B22") },
  "markup.raw.inline": { fg: parseColor("#A5D6FF"), bg: parseColor("#161B22") },
  "markup.link": { fg: parseColor("#58A6FF"), underline: true },
  "markup.link.label": { fg: parseColor("#A5D6FF"), underline: true },
  "markup.link.url": { fg: parseColor("#58A6FF"), underline: true },
  label: { fg: parseColor("#7EE787") },
  conceal: { fg: parseColor("#6E7681") },
  "punctuation.special": { fg: parseColor("#8B949E") },
  default: { fg: parseColor("#E6EDF3") },
};
