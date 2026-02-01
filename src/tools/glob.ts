import { stat } from "fs/promises";
import { Type, type Static } from "typebox";

import type { Tool, ToolConfig } from "./";

const globSchema = Type.Object({
  pattern: Type.String({
    description: "The glob pattern to match files against (e.g., **/*.ts)",
  }),
  path: Type.Optional(
    Type.String({
      description:
        "The directory to search in. Defaults to current working directory.",
    }),
  ),
});

type ArgsType = Static<typeof globSchema>;

const definition = {
  name: "glob",
  description:
    "Fast file pattern matching tool. Supports glob patterns like **/*.js or src/**/*.ts. Returns matching file paths sorted by modification time (most recent first).",
  input_schema: globSchema,
};

const callFunction = async (args: ArgsType, _config: ToolConfig) => {
  const { pattern, path } = args;
  const cwd = path ?? process.cwd();

  const glob = new Bun.Glob(pattern);
  const matches: { path: string; mtime: number }[] = [];

  for await (const file of glob.scan({ cwd, onlyFiles: true })) {
    try {
      const fullPath = `${cwd}/${file}`;
      const stats = await stat(fullPath);
      matches.push({ path: file, mtime: stats.mtimeMs });
    } catch {
      // File may have been deleted between scan and stat, skip it
      matches.push({ path: file, mtime: 0 });
    }
  }

  // Sort by modification time, most recent first
  matches.sort((a, b) => b.mtime - a.mtime);

  if (matches.length === 0) {
    return `No files found matching pattern: ${pattern}`;
  }

  return matches.map((m) => m.path).join("\n");
};

export default { definition, callFunction } as Tool<typeof globSchema>;
