export const isPrintableASCII = (str: string) => /^[\x20-\x7E]*$/.test(str);

const CONTEXT_LINES = 3;

export function generateEditDiff(
  filePath: string,
  content: string,
  oldString: string,
  newString: string
): string {
  const matchIndex = content.indexOf(oldString);
  if (matchIndex === -1) {
    throw new Error("old_string not found in content");
  }

  const lines = content.split("\n");
  const newContent = content.replace(oldString, newString);
  const newLines = newContent.split("\n");

  // Find the line number where the match starts (1-indexed)
  const beforeMatch = content.slice(0, matchIndex);
  const startLine = beforeMatch.split("\n").length;

  // Find the line number where the match ends
  const oldStringLineCount = oldString.split("\n").length;
  const endLine = startLine + oldStringLineCount - 1;

  // Calculate context range
  const contextStart = Math.max(1, startLine - CONTEXT_LINES);
  const contextEndOld = Math.min(lines.length, endLine + CONTEXT_LINES);

  // Calculate how many lines the new string spans
  const newStringLineCount = newString.split("\n").length;
  const newEndLine = startLine + newStringLineCount - 1;
  const contextEndNew = Math.min(newLines.length, newEndLine + CONTEXT_LINES);

  // Build the diff output
  const diffLines: string[] = [];
  diffLines.push(`--- a/${filePath}`);
  diffLines.push(`+++ b/${filePath}`);

  const oldLineCount = contextEndOld - contextStart + 1;
  const newLineCount = contextEndNew - contextStart + 1;
  diffLines.push(`@@ -${contextStart},${oldLineCount} +${contextStart},${newLineCount} @@`);

  // Add context before the change
  for (let i = contextStart; i < startLine; i++) {
    diffLines.push(` ${lines[i - 1]}`);
  }

  // Add removed lines (old string)
  for (let i = startLine; i <= endLine; i++) {
    diffLines.push(`-${lines[i - 1]}`);
  }

  // Add added lines (new string)
  for (let i = startLine; i <= newEndLine; i++) {
    diffLines.push(`+${newLines[i - 1]}`);
  }

  // Add context after the change
  for (let i = endLine + 1; i <= contextEndOld; i++) {
    diffLines.push(` ${lines[i - 1]}`);
  }

  return diffLines.join("\n");
}
