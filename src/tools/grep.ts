import { Type, type Static } from "typebox";

import type { Tool, ToolConfig } from "./";

const grepSchema = Type.Object({
  pattern: Type.String({
    description: "The regex pattern to search for in file contents",
  }),
  path: Type.Optional(
    Type.String({
      description:
        "File or directory to search in. Defaults to current working directory.",
    }),
  ),
  glob: Type.Optional(
    Type.String({
      description:
        'Glob pattern to filter files (e.g., "*.ts", "*.{ts,tsx}")',
    }),
  ),
  ignoreCase: Type.Optional(
    Type.Boolean({
      description: "Case insensitive search. Defaults to false.",
    }),
  ),
  context: Type.Optional(
    Type.Number({
      description: "Number of lines to show before and after each match",
    }),
  ),
  maxResults: Type.Optional(
    Type.Number({
      description: "Maximum number of matching lines to return. Defaults to 100.",
    }),
  ),
});

type ArgsType = Static<typeof grepSchema>;

const definition = {
  name: "grep",
  description:
    "Search for patterns in file contents using ripgrep (rg) or grep. Supports regex patterns and file filtering.",
  input_schema: grepSchema,
};

async function hasCommand(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", cmd], { stdout: "pipe", stderr: "pipe" });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

const callFunction = async (args: ArgsType, _config: ToolConfig) => {
  const {
    pattern,
    path = ".",
    glob: globPattern,
    ignoreCase = false,
    context,
    maxResults = 100,
  } = args;

  const useRg = await hasCommand("rg");
  const cwd = process.cwd();

  let cmdArgs: string[];

  if (useRg) {
    // ripgrep
    cmdArgs = ["rg", "--line-number", "--no-heading", "--color=never"];
    if (ignoreCase) cmdArgs.push("--ignore-case");
    if (context) cmdArgs.push(`--context=${context}`);
    if (globPattern) cmdArgs.push(`--glob=${globPattern}`);
    cmdArgs.push(`--max-count=${maxResults}`);
    cmdArgs.push(pattern, path);
  } else {
    // fallback to grep
    cmdArgs = ["grep", "-rn", "--color=never"];
    if (ignoreCase) cmdArgs.push("-i");
    if (context) cmdArgs.push(`-C${context}`);
    if (globPattern) cmdArgs.push(`--include=${globPattern}`);
    cmdArgs.push(`-m${maxResults}`);
    cmdArgs.push(pattern, path);
  }

  const proc = Bun.spawn(cmdArgs, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  await proc.exited;

  if (proc.exitCode === 1 && stdout === "" && stderr === "") {
    // No matches found (exit code 1 with no output is normal for grep/rg)
    return `No matches found for pattern: ${pattern}`;
  }

  if (proc.exitCode !== 0 && proc.exitCode !== 1) {
    return `Error: ${stderr || "Unknown error occurred"}`;
  }

  const lines = stdout.trim().split("\n");
  if (lines.length >= maxResults) {
    return `${stdout.trim()}\n\n(Results truncated at ${maxResults} matches)`;
  }

  return stdout.trim() || `No matches found for pattern: ${pattern}`;
};

const requiresPermission = false;

const describeInput = (input: ArgsType): string => `pattern: ${input.pattern}`;

export default { definition, callFunction, requiresPermission, describeInput } as Tool<typeof grepSchema>;
