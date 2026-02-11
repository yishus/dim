import { describe, expect, test } from "bun:test";
import { formatQuestionAnswers } from "../../src/tool-runner";
import type { QuestionAnswer } from "../../src/types";

describe("formatQuestionAnswers", () => {
  test("formats answers correctly", () => {
    const answers: QuestionAnswer[] = [
      {
        question: "What color?",
        selectedLabels: ["Red", "Blue"],
        customText: undefined,
      },
    ];
    const result = formatQuestionAnswers(answers);
    expect(result).toContain("Question 1: What color?");
    expect(result).toContain("Selected: Red, Blue");
  });

  test("handles empty array", () => {
    const result = formatQuestionAnswers([]);
    expect(result).toBe("User cancelled the question dialog.");
  });

  test("includes custom text when provided", () => {
    const answers: QuestionAnswer[] = [
      {
        question: "Anything else?",
        selectedLabels: [],
        customText: "My custom response",
      },
    ];
    const result = formatQuestionAnswers(answers);
    expect(result).toContain("Custom response: My custom response");
  });

  test("shows 'No selection made' when no labels and no custom text", () => {
    const answers: QuestionAnswer[] = [
      {
        question: "Pick one",
        selectedLabels: [],
      },
    ];
    const result = formatQuestionAnswers(answers);
    expect(result).toContain("No selection made.");
  });

  test("formats multiple questions", () => {
    const answers: QuestionAnswer[] = [
      { question: "Q1?", selectedLabels: ["A"] },
      { question: "Q2?", selectedLabels: ["B"] },
    ];
    const result = formatQuestionAnswers(answers);
    expect(result).toContain("Question 1: Q1?");
    expect(result).toContain("Question 2: Q2?");
  });
});
