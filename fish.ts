type Swimming = "🐟" | "🐠" | "🐡";
type Crawling = "🦀";
type Vegetation = "🌱";
type Bubble = "🫧";
type Positions = {
  [row: number]: {
    [column: number]: Swimming | Crawling | Vegetation | Bubble;
  };
};

const swimming: Swimming[] = ["🐟", "🐠", "🐡"] as const;
const crawling: Crawling[] = ["🦀"] as const;
const vegetation: Vegetation[] = ["🌱"] as const;
const bubble: Bubble[] = ["🫧"] as const;

const variance = 0.15;
const time = 100;

const placeVegetation = (rows: number, columns: number): Positions => {
  const positions: Positions = {};
  const bottom = rows - 1;
  positions[bottom] = {};
  for (let c = 0; c < columns; c++) {
    if (Math.random() < variance / 4) {
      const v = vegetation[Math.floor(Math.random() * vegetation.length)];

      if (v) {
        positions[bottom][c] = v;
      }
    }
  }
  return positions;
};

const initial = (rows: number, columns: number): Positions => ({
  [Math.floor(Math.random() * (rows - 2))]: {
    [columns - 1]: swimming[
      Math.floor(Math.random() * swimming.length)
    ] as Swimming,
  },
});

const render = (
  rows: number,
  columns: number,
  positions: Positions,
  flora: Positions,
  bubbles: Positions,
): string => {
  let output = "";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      output += flora[r]?.[c] ?? bubbles[r]?.[c] ?? positions[r]?.[c] ?? "  ";
    }
    if (r < rows - 1) output += "\n";
  }

  return output;
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
      if (neighbor && !vegetation.includes(neighbor as Vegetation)) return true;
    }
  }
  return false;
};

const tick = (
  rows: number,
  positions: Positions,
  tickCount: number,
): Positions => {
  const next: Positions = {};

  for (const row of Object.keys(positions).map(Number)) {
    if (!positions[row]) continue;

    for (const col of Object.keys(positions[row]).map(Number)) {
      const species = positions[row][col];
      if (vegetation.includes(species as Vegetation)) continue;
      if (bubble.includes(species as Bubble)) continue;

      const isSwimming = swimming.includes(species as Swimming);

      if (!isSwimming && tickCount % 3 !== 0) {
        if (!next[row]) next[row] = {};
        next[row]![col] = species!;
        continue;
      }

      const newCol = col - 1;

      if (newCol < 0) continue;

      let newRow = row;
      if (isSwimming && Math.random() * 2 < variance) {
        newRow += Math.random() < 0.5 ? -1 : 1;
      }

      if (newRow < 0 || newRow >= (isSwimming ? rows - 2 : rows)) continue;
      if (!species) continue;

      if (hasNeighbor(next, newRow, newCol)) continue;

      if (!next[newRow]) next[newRow] = {};
      next[newRow]![newCol] = species;
    }
  }

  return next;
};

const tickBubbles = (
  rows: number,
  bubbles: Positions,
  positions: Positions,
): Positions => {
  const next: Positions = {};
  for (const row of Object.keys(bubbles).map(Number)) {
    if (!bubbles[row]) continue;
    for (const col of Object.keys(bubbles[row]).map(Number)) {
      const newRow = row - 1;
      if (newRow < 0) continue;
      if (!next[newRow]) next[newRow] = {};
      next[newRow]![col] = "🫧";
    }
  }
  return next;
};

export const stream = (rows: number, columns: number) => {
  const flora = placeVegetation(rows, columns);
  let current: Positions = initial(rows, columns);
  let bubbles: Positions = {};
  let tickCount = 0;

  setInterval(() => {
    if (Math.random() <= variance) {
      const spawn = initial(rows, columns);
      for (const r of Object.keys(spawn).map(Number)) {
        if (!spawn[r]) continue;
        const cols = Object.keys(spawn[r]).map(Number);
        if (cols.some((c) => hasNeighbor(current, r, c))) continue;
        if (!current[r]) current[r] = {};
        Object.assign(current[r], spawn[r]);
      }
    }

    if (Math.random() <= variance / 5) {
      const bottom = rows - 1;
      if (!hasNeighbor(current, bottom, columns - 1)) {
        if (!current[bottom]) current[bottom] = {};
        current[bottom][columns - 1] = crawling[
          Math.floor(Math.random() * crawling.length)
        ] as Crawling;
      }
    }

    if (Math.random() <= variance / 2) {
      const bubbleRow = rows - 2;
      const bubbleCol = Math.floor(Math.random() * columns);
      if (!bubbles[bubbleRow]) bubbles[bubbleRow] = {};
      if (!bubbles[bubbleRow][bubbleCol]) {
        bubbles[bubbleRow][bubbleCol] = "🫧";
      }
    }

    bubbles = tickBubbles(rows, bubbles, current);
    current = tick(rows, current, tickCount);
    tickCount++;

    process.stdout.write("\x1B[H");
    process.stdout.write(render(rows, columns, current, flora, bubbles));
  }, time);
};
