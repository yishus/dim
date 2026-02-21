import type { Message, MessageParam } from "./types";
import type { ToolRunnerCallbacks, QuestionAnswer } from "./types";
import {
  callTool,
  getToolPermission,
  getToolDescription,
  isKnownTool,
  type ToolConfig,
  type ToolInputMap,
  type AskUserQuestionInput,
} from "./tools";
import { getLogger } from "./services/logger";

export type { ToolRunnerCallbacks };

export function formatQuestionAnswers(answers: QuestionAnswer[]): string {
  if (answers.length === 0) {
    return "User cancelled the question dialog.";
  }

  return answers
    .map((answer, idx) => {
      const parts: string[] = [`Question ${idx + 1}: ${answer.question}`];

      if (answer.selectedLabels.length > 0) {
        parts.push(`Selected: ${answer.selectedLabels.join(", ")}`);
      }

      if (answer.customText) {
        parts.push(`Custom response: ${answer.customText}`);
      }

      if (answer.selectedLabels.length === 0 && !answer.customText) {
        parts.push("No selection made.");
      }

      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Execute tool calls from a message and return the tool results as a MessageParam.
 * Returns { resultMessage, interrupted } where interrupted indicates if tool use was denied.
 */
export async function runToolCalls(
  message: Message,
  config: ToolConfig,
  callbacks: ToolRunnerCallbacks,
): Promise<{ resultMessage: MessageParam; interrupted: boolean }> {
  const { canUseTool, askUserQuestion, emitMessage, saveToSessionMemory } =
    callbacks;

  let responses = [];
  let interrupted = false;

  for (const content of message.content) {
    if (content.type === "tool_use") {
      const { id, name, input } = content;
      if (!isKnownTool(name)) {
        responses.push({
          id,
          name,
          content: [
            {
              type: "text" as const,
              text: "Tool not found.",
            },
          ],
        });
      } else {
        if (interrupted) {
          responses.push({
            id,
            name,
            content: [
              {
                type: "text" as const,
                text: "Tool use was interrupted.",
              },
            ],
            isError: true,
          });
          continue;
        }
        if (getToolPermission(name) && canUseTool) {
          const canUse = await canUseTool(name, input);
          if (!canUse) {
            emitMessage?.({
              message: `Interrupted: ${name} ${getToolDescription(name, input)}`,
              type: "agent_update",
            });
            responses.push({
              id,
              name,
              content: [
                {
                  type: "text" as const,
                  text: "Tool use is not permitted.",
                },
              ],
              isError: true,
            });
            interrupted = true;
            continue;
          }
        }
        emitMessage?.({
          message: `${name} ${getToolDescription(name, input)}`,
          type: "tool_use",
        });

        getLogger().logToolCall({ type: "tool_use", id, name, input });

        // Special handling for askUserQuestion tool
        if (name === "askUserQuestion" && askUserQuestion) {
          const askInput = input as AskUserQuestionInput;
          const answers = await askUserQuestion(askInput);
          const result = formatQuestionAnswers(answers);
          responses.push({
            id,
            name,
            content: [{ type: "text" as const, text: result }],
          });

          getLogger().logToolResult(id, result);
          continue;
        }

        let result: string;
        let error: Error | undefined;
        try {
          result = await callTool(name, input, config);
          if (name === "read") {
            const readInput = input as ToolInputMap["read"];
            saveToSessionMemory?.(readInput.path, result);
          }
        } catch (err) {
          error = err as Error;
          result = `Error: ${error.message}`;
        }

        getLogger().logToolResult(id, error ? undefined : result, error);

        responses.push({
          id,
          name,
          content: [{ type: "text" as const, text: result }],
        });
      }
    }
  }

  const resultMessage: MessageParam = {
    role: "user",
    content: responses.map((res) => ({
      type: "tool_result" as const,
      tool_use_id: res.id,
      name: res.name,
      content: res.content,
    })),
  };

  return { resultMessage, interrupted: !interrupted ? false : true };
}
