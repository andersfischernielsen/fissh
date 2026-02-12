import type { Writable } from "stream";

type Swimming = "🐟" | "🐠" | "🐡";
type Crawling = "🦀";
type Vegetation = "🌱";
type Bubble = "🫧";
type Entity = Swimming | Crawling | Vegetation | Bubble;
type Positions = (Entity | null)[][];

const createGrid = (rows: number, columns: number): Positions =>
  Array.from({ length: rows }, () =>
    new Array<Entity | null>(columns).fill(null),
  );

const swimming: Set<Swimming> = new Set(["🐟", "🐠", "🐡"]);
const crawling: Set<Crawling> = new Set(["🦀"]);
const bubble: Set<Bubble> = new Set(["🫧"]);

const variance = 0.15;
const time = 180;

const randomSpawn = (rows: number, columns: number) => ({
  row: Math.floor(Math.random() * (rows - 2)),
  col: columns - 1,
  entity: swimming
    .values()
    .drop(Math.floor(Math.random() * swimming.size))
    .next().value as Swimming,
});

const render = (
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
  col: number,
): boolean => {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const neighbor = positions[row + dr]?.[col + dc];
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

const tick = (
  rows: number,
  columns: number,
  positions: Positions,
  tickCount: number,
): Positions => {
  const next = createGrid(rows, columns);

  for (let row = 0; row < positions.length; row++) {
    for (let col = 0; col < positions[row]!.length; col++) {
      const species = positions[row]![col];
      if (!species) continue;
      if (bubble.has(species as Bubble)) continue;

      const isSwimming = swimming.has(species as Swimming);

      if (!isSwimming && tickCount % 3 !== 0) {
        next[row]![col] = species;
        continue;
      }

      const newCol = col - 1;

      if (newCol < 0) continue;

      let newRow = row;
      if (isSwimming && Math.random() * 2 < variance) {
        newRow += Math.random() < 0.5 ? -1 : 1;
      }

      if (newRow < 0 || newRow >= (isSwimming ? rows - 2 : rows)) continue;

      if (hasNeighbor(next, newRow, newCol)) continue;

      next[newRow]![newCol] = species;
    }
  }

  return next;
};

const tickBubbles = (
  rows: number,
  columns: number,
  bubbles: Positions,
  positions: Positions,
): Positions => {
  const next = createGrid(rows, columns);
  for (let row = 0; row < bubbles.length; row++) {
    for (let col = 0; col < bubbles[row]!.length; col++) {
      if (!bubbles[row]![col]) continue;
      const newRow = row - 1;
      if (newRow < 0) continue;
      next[newRow]![col] = "🫧";
    }
  }
  return next;
};

export const stream = (
  writable: Writable,
  rows: number,
  columns: number,
  dimensions: () => [rows: number, columns: number],
) => {
  let lastColumns = columns;
  let lastRows = rows;
  let current = createGrid(rows, columns);
  const initialSpawn = randomSpawn(rows, columns);
  current[initialSpawn.row]![initialSpawn.col] = initialSpawn.entity;
  let bubbles = createGrid(rows, columns);
  let tickCount = 0;

  writable.write("\x1B[?25l");

  return setInterval(() => {
    const [rows, columns] = dimensions();

    if (rows !== lastRows || columns !== lastColumns) {
      const newCurrent = createGrid(rows, columns);
      const newBubbles = createGrid(rows, columns);
      const minR = Math.min(lastRows, rows);
      const minC = Math.min(lastColumns, columns);
      for (let r = 0; r < minR; r++) {
        for (let c = 0; c < minC; c++) {
          newCurrent[r]![c] = current[r]![c]!;
          newBubbles[r]![c] = bubbles[r]![c]!;
        }
      }
      if (rows !== lastRows) {
        const oldBottom = lastRows - 1;
        const newBottom = rows - 1;
        if (oldBottom < rows) {
          for (let c = 0; c < minC; c++) {
            const species = newCurrent[oldBottom]![c];
            if (species && crawling.has(species as Crawling)) {
              newCurrent[newBottom]![c] = species;
              newCurrent[oldBottom]![c] = null;
            }
          }
        }
      }
      current = newCurrent;
      bubbles = newBubbles;
    }

    lastColumns = columns;
    lastRows = rows;

    if (Math.random() <= variance) {
      const spawn = randomSpawn(rows, columns);
      if (!hasNeighbor(current, spawn.row, spawn.col)) {
        current[spawn.row]![spawn.col] = spawn.entity;
      }
    }

    if (Math.random() <= variance / 6) {
      const bottom = rows - 1;
      if (!hasNeighbor(current, bottom, columns - 1)) {
        current[bottom]![columns - 1] = crawling
          .values()
          .drop(Math.floor(Math.random() * crawling.size))
          .next().value as Crawling;
      }
    }

    if (Math.random() <= variance / 2) {
      const bubbleRow = rows - 2;
      const bubbleCol = Math.floor(Math.random() * columns);
      if (!bubbles[bubbleRow]![bubbleCol]) {
        bubbles[bubbleRow]![bubbleCol] = "🫧";
      }
    }

    bubbles = tickBubbles(rows, columns, bubbles, current);
    current = tick(rows, columns, current, tickCount);
    tickCount++;

    writable.write("\x1B[H" + render(rows, columns, current, bubbles));
  }, time);
};
