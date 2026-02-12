import { stream } from "./fish";

export const start = () =>
  stream(
    process.stdout,
    process.stdout.rows,
    Math.floor(process.stdout.columns / 2),
    () => [process.stdout.rows, Math.floor(process.stdout.columns / 2)],
  );
