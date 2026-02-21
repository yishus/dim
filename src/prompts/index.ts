export interface SystemPromptDef {
  id: string;
  name: string;
  description: string;
  filename: string;
}

export const SYSTEM_PROMPTS: SystemPromptDef[] = [
  {
    id: "coding",
    name: "Coding",
    description: "Software engineering assistant",
    filename: "system_workflow.md",
  },
  {
    id: "general",
    name: "General",
    description: "General purpose assistant",
    filename: "system_general.md",
  },
  {
    id: "research",
    name: "Research",
    description: "Research and analysis assistant",
    filename: "system_research.md",
  },
];

export const DEFAULT_SYSTEM_PROMPT_ID = "coding";
