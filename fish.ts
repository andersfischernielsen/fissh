import type { Writable } from "stream";

type Swimming = "🐟" | "🐠" | "🐡";
type Crawling = "🦀";
type Vegetation = "🌱";
type Bubble = "🫧";
type Entity = Swimming | Crawling | Vegetation | Bubble;
type Positions = (Entity | null)[][];
type Diff = { row: number; column: number; text: string };

const swimming: Set<Swimming> = new Set(["🐟", "🐠", "🐡"]);
const crawling: Set<Crawling> = new Set(["🦀"]);
const bubble: Set<Bubble> = new Set(["🫧"]);

const variance = 0.15;
const tickRate = 140;

const createGrid = (rows: number, columns: number): Positions =>
  Array.from({ length: rows }, () =>
    new Array<Entity | null>(columns).fill(null),
  );

const shouldSpawnSwimming = () => Math.random() <= variance;
const shouldSpawnCrawling = () => Math.random() <= variance / 6;
const shouldSpawnBubble = () => Math.random() <= variance / 2;

const randomSpawn = (rows: number, columns: number, current: Positions) => {
  const row = Math.floor(Math.random() * (rows - 2));
  const col = columns - 1;
  if (!hasNeighbor(current, row, col)) {
    current[row]![col] = swimming
      .values()
      .drop(Math.floor(Math.random() * swimming.size))
      .next().value as Swimming;
  }
};

const spawnSwimming = (rows: number, columns: number, current: Positions) => {
  if (!shouldSpawnSwimming()) return;
  randomSpawn(rows, columns, current);
};

const spawnCrawling = (rows: number, columns: number, current: Positions) => {
  if (!shouldSpawnCrawling()) return;

  const bottom = rows - 1;
  if (!hasNeighbor(current, bottom, columns - 1)) {
    current[bottom]![columns - 1] = crawling
      .values()
      .drop(Math.floor(Math.random() * crawling.size))
      .next().value as Crawling;
  }
};

const spawnBubbles = (rows: number, columns: number, bubbles: Positions) => {
  if (!shouldSpawnBubble()) return;

  const bubbleRow = rows - 2;
  const bubbleCol = Math.floor(Math.random() * columns);
  if (!bubbles[bubbleRow]![bubbleCol]) {
    bubbles[bubbleRow]![bubbleCol] = "🫧";
  }
};

const resize = (
  oldRows: number,
  oldColumns: number,
  newRows: number,
  newColumns: number,
  current: Positions,
  bubbles: Positions,
): [Positions, Positions] => {
  const newCurrent = createGrid(newRows, newColumns);
  const newBubbles = createGrid(newRows, newColumns);
  const minCols = Math.min(oldColumns, newColumns);
  const minRows = Math.min(oldRows, newRows);
  const oldBottom = oldRows - 1;
  const newBottom = newRows - 1;

  for (let r = 0; r < minRows; r++) {
    for (let c = 0; c < minCols; c++) {
      const species = current[r]![c];
      if (species && crawling.has(species as Crawling)) {
        newCurrent[newBottom]![c] = species;
      } else {
        newCurrent[r]![c] = species ?? null;
      }
      newBubbles[r]![c] = bubbles[r]![c] ?? null;
    }
  }

  if (oldBottom >= minRows) {
    for (let c = 0; c < minCols; c++) {
      const species = current[oldBottom]![c];
      if (species && crawling.has(species as Crawling)) {
        newCurrent[newBottom]![c] = species;
      }
    }
  }

  return [newCurrent, newBubbles];
};

const refresh = (
  rows: number,
  columns: number,
  positions: Positions,
  bubbles: Positions,
): string => {
  const parts: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      parts.push(bubbles[r]?.[c] ?? positions[r]?.[c] ?? "  ");
    }
    if (r < rows - 1) parts.push("\r\n");
  }

  return parts.join("");
};

const hasNeighbor = (
  positions: Positions,
  row: number,
  column: number,
): boolean => {
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      if (r === 0 && c === 0) continue;

      const neighbor = positions[row + r]?.[column + c];
      if (
        neighbor &&
        !swimming.has(neighbor as Swimming) &&
        !crawling.has(neighbor as Crawling)
      )
        return true;
    }
  }

  return false;
};

const tickFish = (
  rows: number,
  columns: number,
  positions: Positions,
  tickCount: number,
): Positions => {
  const next = createGrid(rows, columns);

  for (let row = 0; row < positions.length; row++) {
    for (let column = 0; column < positions[row]!.length; column++) {
      const species = positions[row]![column];
      if (!species) continue;
      if (bubble.has(species as Bubble)) continue;

      const isSwimming = swimming.has(species as Swimming);

      if (!isSwimming && tickCount % 3 !== 0) {
        next[row]![column] = species;
        continue;
      }

      const newColumn = column - 1;
      if (newColumn < 0) continue;

      let newRow = row;
      if (isSwimming && Math.random() < variance / 2) {
        newRow += Math.random() < 0.5 ? -1 : 1;
      }

      if (newRow < 0) continue;
      if (isSwimming && newRow >= rows - 2) {
        newRow = row;
      }

      if (hasNeighbor(next, newRow, newColumn)) continue;

      next[newRow]![newColumn] = species;
    }
  }

  return next;
};

const tickBubbles = (
  rows: number,
  columns: number,
  bubbles: Positions,
): Positions => {
  const next = createGrid(rows, columns);
  for (let row = 0; row < bubbles.length; row++) {
    for (let column = 0; column < bubbles[row]!.length; column++) {
      if (!bubbles[row]![column]) continue;
      const newRow = row - 1;
      if (newRow < 0) continue;
      next[newRow]![column] = "🫧";
    }
  }

  return next;
};

const cellText = (
  r: number,
  c: number,
  positions: Positions,
  bubbles: Positions,
  cellWidth = 2,
): string => {
  const v = bubbles[r]?.[c] ?? positions[r]?.[c] ?? null;
  if (!v) return "  ";
  return (v + " ").slice(0, cellWidth);
};

const diff = (
  rows: number,
  cols: number,
  prev: string[],
  next: string[],
): Diff[] => {
  const diff: Diff[] = [];
  const n = rows * cols;
  for (let i = 0; i < n; i++) {
    if (prev[i] !== next[i]) {
      const r = Math.floor(i / cols);
      const c = i - r * cols;
      diff.push({ row: r, column: c, text: next[i]! });
    }
  }

  return diff;
};

const compose = (
  rows: number,
  cols: number,
  positions: Positions,
  bubbles: Positions,
): string[] => {
  const flat = new Array<string>(rows * cols);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      flat[i++] = cellText(r, c, positions, bubbles);
    }
  }
  return flat;
};

const moveCursor = (row0: number, col0: number, cellWidth = 2): string => {
  const row = row0 + 1;
  const col = col0 * cellWidth + 1;
  return `\x1B[${row};${col}H`;
};

export const render = (
  writable: Writable,
  rows: number,
  columns: number,
  dimensions: () => [rows: number, columns: number],
) => {
  let lastColumns = columns;
  let lastRows = rows;
  let current = createGrid(rows, columns);
  let bubbles = createGrid(rows, columns);
  let tickCount = 0;

  randomSpawn(rows, columns, current);

  writable.write("\x1B[?25l");

  const initial = "\x1B[H" + refresh(rows, columns, current, bubbles);
  writable.write(initial);

  let previous = compose(rows, columns, current, bubbles);

  const interval = setInterval(() => {
    const [rows, columns] = dimensions();

    let resized = false;
    if (rows !== lastRows || columns !== lastColumns) {
      [current, bubbles] = resize(
        lastRows,
        lastColumns,
        rows,
        columns,
        current,
        bubbles,
      );
      resized = true;
    }

    lastColumns = columns;
    lastRows = rows;

    spawnSwimming(rows, columns, current);
    spawnCrawling(rows, columns, current);
    spawnBubbles(rows, columns, bubbles);

    bubbles = tickBubbles(rows, columns, bubbles);
    current = tickFish(rows, columns, current, tickCount);
    tickCount++;

    if (resized) {
      const frame = "\x1B[H" + refresh(rows, columns, current, bubbles);
      writable.write(frame);
      previous = compose(rows, columns, current, bubbles);
      return;
    }

    const next = compose(rows, columns, current, bubbles);
    const diffs = diff(rows, columns, previous, next);
    const out = diffs.reduce(
      (acc, diff) => acc + moveCursor(diff.row, diff.column) + diff.text,
      "",
    );

    if (out.length > 0) writable.write(out);
    previous = next;
  }, tickRate);

  const closeWritable = (writable: Writable) => {
    writable.write("\x1B[2J");
    writable.write("\x1B[H");
    writable.write("\x1B[?25h");
  };

  return {
    interval,
    closeWritable,
  };
};
