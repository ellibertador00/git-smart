export type CliCommand = "commit" | "push" | "status" | "help" | "unknown";

export interface ParsedArgs {
  command: CliCommand;
  flags: Set<string>;
}

const COMMAND_ALIASES: Record<string, CliCommand> = {
  c: "commit",
  commit: "commit",
  p: "push",
  push: "push",
  s: "status",
  status: "status",
  h: "help",
  help: "help",
};

export function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Set<string>();
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg.startsWith("-")) {
      flags.add(arg);
    } else {
      positional.push(arg);
    }
  }

  if (flags.has("-h") || flags.has("--help")) {
    return { command: "help", flags };
  }

  if (positional.length === 0) {
    return { command: "help", flags };
  }

  const command = COMMAND_ALIASES[positional[0]] ?? "unknown";
  return { command, flags };
}
