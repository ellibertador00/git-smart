export class CliError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}

export class GitError extends CliError {
  constructor(message: string, public readonly stderr?: string) {
    super(message);
  }
}

export class ConfigError extends CliError {}

export class ProviderError extends CliError {}

export class UserAbortedError extends CliError {}

export function isCliError(error: unknown): error is CliError {
  return error instanceof CliError;
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof GitError && error.stderr) {
    return `${error.message}\n${error.stderr}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
