import pc from "picocolors";

export const out = {
  info: (message: string) => console.log(pc.dim(message)),
  step: (message: string) => console.log(pc.yellow(message)),
  success: (message: string) => console.log(pc.green(message)),
  warning: (message: string) => console.warn(pc.yellow(message)),
  error: (message: string) => console.error(pc.red(message)),
  preview: (message: string) => console.log(pc.bold(pc.cyan(message))),
  secondary: (message: string) => console.log(pc.dim(message)),
};

export type Output = typeof out;
