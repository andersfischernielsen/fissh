import { stream } from "./fish";

stream(process.stdout.rows, Math.floor(process.stdout.columns / 2));
