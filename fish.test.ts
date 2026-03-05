import { describe, it, expect } from "bun:test";
import {
  createGrid,
  hasNeighbor,
  tickFish,
  tickBubbles,
  compose,
  diff,
  moveCursor,
  refresh,
  resize,
} from "./fish";

describe("Grid Utilities", () => {
  it("creates empty grid of correct dimensions", () => {
    const grid = createGrid(4, 6);
    expect(grid).toHaveLength(4);
    expect(grid[0]).toHaveLength(6);
    expect(grid[0]?.[0]).toBe(null);
  });

  it("initializes all cells to null", () => {
    const grid = createGrid(3, 3);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(grid[r]?.[c]).toBe(null);
      }
    }
  });
});

describe("Collision Detection", () => {
  it("detects vegetation neighbors", () => {
    const grid = createGrid(3, 3);
    grid[1]![1] = "🌱";
    const hasNeighborAt0_0 = hasNeighbor(grid, 0, 0);
    expect(hasNeighborAt0_0).toBe(true);
  });

  it("ignores swimming neighbors", () => {
    const grid = createGrid(3, 3);
    grid[1]![1] = "🐟";
    const hasNeighborAt0_0 = hasNeighbor(grid, 0, 0);
    expect(hasNeighborAt0_0).toBe(false);
  });

  it("ignores crawling neighbors", () => {
    const grid = createGrid(3, 3);
    grid[1]![1] = "🦀";
    const hasNeighborAt0_0 = hasNeighbor(grid, 0, 0);
    expect(hasNeighborAt0_0).toBe(false);
  });

  it("returns false for empty grid", () => {
    const grid = createGrid(3, 3);
    const hasNeighborAt1_1 = hasNeighbor(grid, 1, 1);
    expect(hasNeighborAt1_1).toBe(false);
  });
});

describe("Fish Ticking", () => {
  it("preserves grid dimensions", () => {
    const grid = createGrid(5, 8);
    const next = tickFish(5, 8, grid, 0);
    expect(next).toHaveLength(5);
    expect(next[0]?.length).toBe(8);
  });

  it("moves fish leftward", () => {
    const grid = createGrid(3, 5);
    grid[1]![3] = "🐟";
    const next = tickFish(3, 5, grid, 1);

    const hasFishAtColumn2 = next[1]?.some(
      (cell, idx) => idx === 2 && cell === "🐟",
    );
    expect(hasFishAtColumn2 || next[1]?.[3] === "🐟").toBe(true);
  });

  it("clamps swimming fish at bottom cutoff", () => {
    const grid = createGrid(5, 5);
    grid[2]![2] = "🐟";
    const next = tickFish(5, 5, grid, 100);

    let foundFishBelowCutoff = false;
    for (let c = 0; c < 5; c++) {
      if (next[3]?.[c] === "🐟" || next[4]?.[c] === "🐟") {
        foundFishBelowCutoff = true;
      }
    }
    expect(foundFishBelowCutoff).toBe(false);
  });
});

describe("Bubble Ticking", () => {
  it("preserves grid dimensions", () => {
    const grid = createGrid(5, 8);
    const next = tickBubbles(5, 8, grid);
    expect(next).toHaveLength(5);
    expect(next[0]?.length).toBe(8);
  });

  it("moves bubbles upward", () => {
    const grid = createGrid(5, 5);
    grid[3]![2] = "🫧";
    const next = tickBubbles(5, 5, grid);

    expect(next[2]?.[2]).toBe("🫧");
    expect(next[3]?.[2]).not.toBe("🫧");
  });

  it("removes bubbles at top", () => {
    const grid = createGrid(5, 5);
    grid[0]![2] = "🫧";
    const next = tickBubbles(5, 5, grid);

    expect(next[0]?.[2]).not.toBe("🫧");
  });
});

describe("Compose", () => {
  it("flattens grid to string array", () => {
    const grid = createGrid(2, 3);
    const bubbles = createGrid(2, 3);
    const flat = compose(2, 3, grid, bubbles);

    expect(flat).toHaveLength(6);
  });

  it("renders entities correctly", () => {
    const positions = createGrid(2, 3);
    const bubbles = createGrid(2, 3);
    positions[0]![0] = "🐟";
    bubbles[1]![2] = "🫧";

    const flat = compose(2, 3, positions, bubbles);

    expect(flat[0]).toContain("🐟");
    expect(flat[5]).toContain("🫧");
  });

  it("renders empty cells as spaces", () => {
    const positions = createGrid(1, 2);
    const bubbles = createGrid(1, 2);
    const flat = compose(1, 2, positions, bubbles);

    expect(flat[0]).toBe("  ");
    expect(flat[1]).toBe("  ");
  });

  it("prefers bubbles over positions", () => {
    const positions = createGrid(1, 1);
    const bubbles = createGrid(1, 1);
    positions[0]![0] = "🐟";
    bubbles[0]![0] = "🫧";

    const flat = compose(1, 1, positions, bubbles);
    expect(flat[0]).toContain("🫧");
  });
});

describe("Diff", () => {
  it("identifies changed cells", () => {
    const prev = new Array(4).fill("  ");
    prev[1] = "🐟";
    const next = new Array(4).fill("  ");
    next[1] = "🐠";

    const changes = diff(2, 2, prev, next);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.row).toBe(0);
    expect(changes[0]?.column).toBe(1);
  });

  it("returns empty for identical grids", () => {
    const prev = new Array(4).fill("  ");
    const next = new Array(4).fill("  ");

    const changes = diff(2, 2, prev, next);
    expect(changes).toHaveLength(0);
  });

  it("calculates correct row/column indices", () => {
    const prev = new Array(6).fill("  ");
    const next = new Array(6).fill("  ");
    next[4] = "🐟";

    const changes = diff(3, 2, prev, next);
    expect(changes[0]?.row).toBe(2);
    expect(changes[0]?.column).toBe(0);
  });
});

describe("Cursor Movement", () => {
  it("generates correct ANSI escape code", () => {
    const move = moveCursor(0, 0);
    expect(move).toBe("\x1B[1;1H");
  });

  it("accounts for cell width", () => {
    const move = moveCursor(2, 3);
    expect(move).toBe("\x1B[3;7H");
  });

  it("handles custom cell width", () => {
    const move = moveCursor(1, 2, 3);
    expect(move).toBe("\x1B[2;7H");
  });
});

describe("Refresh", () => {
  it("generates full grid string", () => {
    const positions = createGrid(2, 3);
    const bubbles = createGrid(2, 3);
    positions[0]![0] = "🐟";

    const output = refresh(2, 3, positions, bubbles);
    expect(output).toBeDefined();
    expect(output).toContain("🐟");
    expect(output).toContain("\r\n");
  });
});

describe("Resize", () => {
  it("preserves shared area", () => {
    const current = createGrid(3, 3);
    const bubbles = createGrid(3, 3);
    current[0]![0] = "🐟";

    const [newCurrent, newBubbles] = resize(3, 3, 4, 4, current, bubbles);

    expect(newCurrent[0]?.[0]).toBe("🐟");
  });

  it("handles downsizing", () => {
    const current = createGrid(4, 4);
    const bubbles = createGrid(4, 4);
    current[0]![0] = "🐟";

    const [newCurrent] = resize(4, 4, 2, 2, current, bubbles);

    expect(newCurrent).toHaveLength(2);
    expect(newCurrent[0]).toHaveLength(2);
  });

  it("moves crawling to bottom", () => {
    const current = createGrid(3, 3);
    const bubbles = createGrid(3, 3);
    current[0]![0] = "🦀";

    const [newCurrent] = resize(3, 3, 4, 3, current, bubbles);

    expect(newCurrent[3]?.[0]).toBe("🦀");
  });
});

describe("Performance", () => {
  const columns = 400;
  const rows = 200;

  it("ticks efficiently", () => {
    const iterations = 100;

    const grid = createGrid(rows, columns);
    grid[10]![40] = "🐟";
    grid[12]![50] = "🐠";

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      tickFish(rows, columns, grid, i);
    }
    const elapsed = performance.now() - start;

    console.log(`tickFish x${iterations}}: ${elapsed.toFixed(2)}ms`);
    console.log(`tickFish average: ${(elapsed / iterations).toFixed(2)}ms`);

    expect(elapsed).toBeLessThan(1000);
  });

  it("composes efficiently", () => {
    const iterations = 1000;

    const positions = createGrid(rows, columns);
    const bubbles = createGrid(rows, columns);

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      compose(rows, columns, positions, bubbles);
    }
    const elapsed = performance.now() - start;

    console.log(`compose x${iterations}: ${elapsed.toFixed(2)}ms`);
    console.log(`compose average: ${(elapsed / iterations).toFixed(2)}ms`);

    expect(elapsed).toBeLessThan(1000);
  });

  it("diffs efficiently", () => {
    const iterations = 1000;
    const prev = new Array(1920).fill("  ");
    const next = new Array(1920).fill("  ");
    next[500] = "🐟";

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      diff(rows, columns, prev, next);
    }
    const elapsed = performance.now() - start;

    console.log(`diff x${iterations}: ${elapsed.toFixed(2)}ms`);
    console.log(`diff average: ${(elapsed / iterations).toFixed(2)}ms`);

    expect(elapsed).toBeLessThan(1000);
  });
});
