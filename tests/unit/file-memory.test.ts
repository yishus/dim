import { describe, expect, test } from "bun:test";
import { FileMemoryService } from "../../src/services/file-memory";

describe("FileMemoryService", () => {
  test("save and get", () => {
    const mem = new FileMemoryService();
    mem.save("foo.ts", "hello world");
    expect(mem.get("foo.ts")).toBe("hello world");
  });

  test("get returns undefined for missing keys", () => {
    const mem = new FileMemoryService();
    expect(mem.get("missing")).toBeUndefined();
  });

  test("computeEditDiff produces a diff", () => {
    const mem = new FileMemoryService();
    mem.save("/tmp/test.ts", "line1\nline2\nline3\n");

    const diff = mem.computeEditDiff({
      path: "/tmp/test.ts",
      old_string: "line2",
      new_string: "lineTwo",
    });

    expect(diff).toContain("--- a//tmp/test.ts");
    expect(diff).toContain("-line2");
    expect(diff).toContain("+lineTwo");
  });

  test("computeWriteDiff produces a diff for new file", () => {
    const mem = new FileMemoryService();

    const diff = mem.computeWriteDiff({
      path: "/tmp/new.ts",
      content: "new content\n",
    });

    expect(diff).toContain("--- /dev/null");
    expect(diff).toContain("+new content");
  });

  test("computeWriteDiff produces a diff for existing file", () => {
    const mem = new FileMemoryService();
    mem.save("/tmp/existing.ts", "old content\n");

    const diff = mem.computeWriteDiff({
      path: "/tmp/existing.ts",
      content: "new content\n",
    });

    expect(diff).toContain("-old content");
    expect(diff).toContain("+new content");
  });
});
