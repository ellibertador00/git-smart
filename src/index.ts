import process from "node:process";

import pkg from "../package.json" assert { type: "json" };
import { runCommitCommand } from "./commands/commit";
import { runPushCommand } from "./commands/push";
import { runStatusCommand } from "./commands/status";
import { parseArgs } from "./lib/args";
import { out } from "./lib/output";
import { formatErrorMessage, isCliError } from "./lib/errors";
import printHelp from "./lib/help";

async function main() {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);

  if (parsed.flags.has("-v") || parsed.flags.has("--version")) {
    console.log(pkg.version ?? "0.0.0");
    return;
  }

  switch (parsed.command) {
    case "commit":
      await runCommitCommand();
      break;
    case "push":
      await runPushCommand();
      break;
    case "status":
      runStatusCommand();
      break;
    case "help":
      printHelp();
      break;
    default:
      printHelp();
      out.warning("Unknown command.");
      process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = formatErrorMessage(error);
  if (isCliError(error)) {
    out.error(message);
  } else {
    out.error(`Unexpected error: ${message}`);
  }
  process.exit(1);
});
