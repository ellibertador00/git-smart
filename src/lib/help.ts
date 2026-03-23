import pc from "picocolors";

const I = "  ";

const HINTS = [
  ["c", "generate commit message and commit"],
  ["p", "push current branch"],
  ["s", "show git status"],
  ["h", "show help"],
] as const;

const heroLine = () => {
  const title = pc.cyan("gt");
  const tagline = pc.bold(pc.white("· LIGHTNING-FAST GIT COMPANION"));
  console.log(`${I}${title} ${tagline}`);
  console.log();
};

const hintLine = (key: string, description: string) => {
  const gt = pc.cyan("gt");
  const command = pc.bold(pc.green(key));
  const hash = pc.bold(pc.white("#"));
  return `${I}${gt} ${command}   ${hash} ${pc.white(description)}`;
};

export default function printHelp(): void {
  console.log();
  heroLine();
  HINTS.forEach(([key, description]) => console.log(hintLine(key, description)));
  console.log();
}
