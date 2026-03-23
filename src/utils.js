import { GRID_SIZE, SHIP_SIZES } from "./constants.js";

export function createEmptyGrid(fillValue = null) {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fillValue));
}

export function cloneCells(cells) {
  return cells.map((cell) => ({ x: cell.x, y: cell.y }));
}

export function normalizeShips(ships) {
  return ships.map((ship, index) => ({
    id: ship.id ?? `client-ship-${index}`,
    size: ship.size,
    cells: cloneCells(ship.cells)
  }));
}

export function buildCellsFromStart(startX, startY, size, vertical) {
  return Array.from({ length: size }, (_, offset) => ({
    x: startX + (vertical ? 0 : offset),
    y: startY + (vertical ? offset : 0)
  }));
}

export function isInsideBoard(x, y) {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function validateFleetLocally(ships) {
  if (ships.length > SHIP_SIZES.length) {
    return false;
  }

  const occupied = new Set();
  for (const ship of ships) {
    if (ship.cells.length !== ship.size) {
      return false;
    }

    for (const cell of ship.cells) {
      if (!isInsideBoard(cell.x, cell.y)) {
        return false;
      }

      const key = `${cell.x},${cell.y}`;
      if (occupied.has(key)) {
        return false;
      }
      occupied.add(key);
    }
  }

  for (const ship of ships) {
    for (const cell of ship.cells) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          if (!isInsideBoard(nx, ny)) {
            continue;
          }
          const adjacentKey = `${nx},${ny}`;
          if (occupied.has(adjacentKey) && !ship.cells.some((part) => part.x === nx && part.y === ny)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}
