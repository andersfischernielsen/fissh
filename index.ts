import { stream } from "./fish";

stream(
  process.stdout.rows,
  Math.floor(process.stdout.columns / 2),
  () => ({
    rows: process.stdout.rows,
    columns: Math.floor(process.stdout.columns / 2),
  }),
);
