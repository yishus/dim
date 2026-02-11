import { generateEditDiff, generateWriteDiff } from "../helper";
import type { ToolInputMap } from "../tools";

export class FileMemoryService {
  private store: Record<string, unknown> = {};

  save(key: string, value: unknown): void {
    this.store[key] = value;
  }

  get(key: string): unknown {
    return this.store[key];
  }

  computeEditDiff(input: ToolInputMap["edit"]): string {
    const content = this.store[input.path] as string;
    return generateEditDiff(
      input.path,
      content,
      input.old_string,
      input.new_string,
    );
  }

  computeWriteDiff(input: ToolInputMap["write"]): string {
    const existingContent = this.store[input.path] as string | undefined;
    return generateWriteDiff(input.path, existingContent, input.content);
  }
}
