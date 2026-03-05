import { render } from "./fish";

export const start = () => {
  const { closeWritable } = render(
    process.stdout,
    process.stdout.rows,
    Math.floor(process.stdout.columns / 2),
    () => [process.stdout.rows, Math.floor(process.stdout.columns / 2)],
  );

  const exit = () => {
    closeWritable(process.stdout);
    process.exit(0);
  };

  process.on("SIGINT", exit);
  process.on("SIGKILL", exit);
};
