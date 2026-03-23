import { ensureRepo, getStatusLines } from "../lib/git";
import { out } from "../lib/output";
import pc from "picocolors";

export function runStatusCommand(): void {
  ensureRepo();
  const lines = getStatusLines();
  if (lines.length === 0) {
    out.success("clean working tree");
    return;
  }

  const [branchLine, ...rest] = lines;
  if (branchLine.startsWith("##")) {
    out.info(branchLine.replace(/^## /, ""));
  } else {
    out.info(branchLine);
  }

  if (rest.length === 0) {
    out.success("no pending changes");
    return;
  }

  for (const line of rest) {
    console.log(colorizeStatus(line));
  }
}

function colorizeStatus(line: string): string {
  const status = line.slice(0, 2).trim();
  const file = line.slice(2).trim();
  switch (status) {
    case "M":
    case "MM":
      return `${pc.yellow(status.padEnd(2))} ${file}`;
    case "A":
      return `${pc.green(status.padEnd(2))} ${file}`;
    case "D":
      return `${pc.red(status.padEnd(2))} ${file}`;
    case "??":
      return `${pc.cyan(status)} ${file}`;
    default:
      return `${pc.dim(status.padEnd(2))} ${file}`;
  }
}
