import { getToolDescription } from "../tools";
import type { AskUserQuestionInput } from "../tools";
import type {
  ToolUseRequest,
  AskUserQuestionRequest,
  QuestionAnswer,
} from "../types";

export class ToolService {
  canUseToolHandler?: (request: ToolUseRequest) => Promise<boolean>;
  askUserQuestionHandler?: (
    request: AskUserQuestionRequest,
  ) => Promise<QuestionAnswer[]>;

  async requestToolApproval(
    toolName: string,
    input: unknown,
  ): Promise<boolean> {
    const description = getToolDescription(toolName, input);
    const canUse = await this.canUseToolHandler?.({
      toolName,
      description,
      input,
    });
    return canUse || false;
  }

  async askUserQuestion(
    input: AskUserQuestionInput,
  ): Promise<QuestionAnswer[]> {
    if (!this.askUserQuestionHandler) return [];
    return this.askUserQuestionHandler({ input });
  }
}
