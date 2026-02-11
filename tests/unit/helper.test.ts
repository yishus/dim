import { describe, expect, test } from "bun:test";
import { generateEditDiff, generateWriteDiff, isPrintableASCII } from "../../src/helper";

describe("generateEditDiff", () => {
  test("produces correct unified diff for single edit", () => {
    const content = "line1\nline2\nline3\nline4\nline5";
    const diff = generateEditDiff("test.txt", content, "line3", "LINE_THREE");
    expect(diff).toContain("--- a/test.txt");
    expect(diff).toContain("+++ b/test.txt");
    expect(diff).toContain("-line3");
    expect(diff).toContain("+LINE_THREE");
  });

  test("with replaceAll flag replaces all occurrences", () => {
    const content = "foo\nbar\nfoo\nbaz";
    const diff = generateEditDiff("test.txt", content, "foo", "FOO", true);
    expect(diff).toContain("-foo");
    expect(diff).toContain("+FOO");
    // Both occurrences should be replaced
    const minusCount = (diff.match(/^-foo$/gm) || []).length;
    const plusCount = (diff.match(/^\+FOO$/gm) || []).length;
    expect(minusCount).toBe(2);
    expect(plusCount).toBe(2);
  });

  test("throws when old_string not found", () => {
    const content = "line1\nline2\nline3";
    expect(() => {
      generateEditDiff("test.txt", content, "nonexistent", "replacement");
    }).toThrow("old_string not found in content");
  });

  test("returns empty string when old_string equals new_string", () => {
    const content = "line1\nline2\nline3";
    const diff = generateEditDiff("test.txt", content, "line2", "line2");
    expect(diff).toBe("");
  });
});

describe("generateWriteDiff", () => {
  test("shows /dev/null source for new file", () => {
    const diff = generateWriteDiff("new-file.txt", undefined, "hello\nworld");
    expect(diff).toContain("--- /dev/null");
    expect(diff).toContain("+++ b/new-file.txt");
    expect(diff).toContain("+hello");
    expect(diff).toContain("+world");
  });

  test("shows diff for existing file modification", () => {
    const existing = "line1\nline2\nline3";
    const newContent = "line1\nMODIFIED\nline3";
    const diff = generateWriteDiff("file.txt", existing, newContent);
    expect(diff).toContain("--- a/file.txt");
    expect(diff).toContain("+++ b/file.txt");
    expect(diff).toContain("-line2");
    expect(diff).toContain("+MODIFIED");
  });

  test("returns empty string when content is identical", () => {
    const content = "same\ncontent";
    const diff = generateWriteDiff("file.txt", content, content);
    expect(diff).toBe("");
  });
});

describe("isPrintableASCII", () => {
  test("returns true for printable ASCII string", () => {
    expect(isPrintableASCII("Hello, World! 123")).toBe(true);
  });

  test("returns true for empty string", () => {
    expect(isPrintableASCII("")).toBe(true);
  });

  test("returns false for string with control characters", () => {
    expect(isPrintableASCII("hello\x00world")).toBe(false);
  });

  test("returns false for string with newline", () => {
    expect(isPrintableASCII("hello\nworld")).toBe(false);
  });

  test("returns false for string with tab", () => {
    expect(isPrintableASCII("hello\tworld")).toBe(false);
  });

  test("returns true for all printable ASCII chars", () => {
    // Space (0x20) through tilde (0x7E)
    expect(isPrintableASCII(" ~")).toBe(true);
  });

  test("returns false for DEL character (0x7F)", () => {
    expect(isPrintableASCII("\x7F")).toBe(false);
  });
});
