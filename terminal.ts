import { render } from "./fish";

export const start = () => {
  const { close } = render(
    process.stdout,
    process.stdout.rows,
    Math.floor(process.stdout.columns / 2),
    () => [process.stdout.rows, Math.floor(process.stdout.columns / 2)],
  );

  const exit = () => {
    close(process.stdout);
    process.exit(0);
  };

  process.on("SIGINT", exit);
  process.on("SIGKILL", exit);
};
