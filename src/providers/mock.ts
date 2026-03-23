import { PromptPayload } from "../types";
import { CommitMessageProvider, ProviderGenerateOptions } from "./index";

export class MockProvider implements CommitMessageProvider {
  readonly name = "mock" as const;

  async generateCommitMessage(_prompt: PromptPayload, options?: ProviderGenerateOptions): Promise<string> {
    const message = process.env.GT_MOCK_COMMIT_MESSAGE ?? "chore: mock commit";
    options?.onToken?.(message);
    return message;
  }
}
