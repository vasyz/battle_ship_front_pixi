import { SHIP_SIZES } from "./constants.js";
import { buildCellsFromStart, normalizeShips, validateFleetLocally } from "./utils.js";

export class ShipPlacementController {
  constructor() {
    this.reset();
  }

  reset() {
    this.vertical = false;
    this.nextShipIndex = 0;
    this.ships = [];
    this.preview = null;
  }

  rotate() {
    this.vertical = !this.vertical;
    return this.vertical;
  }

  getCurrentShipSize() {
    return SHIP_SIZES[this.nextShipIndex] ?? null;
  }

  hasPlacedAllShips() {
    return this.nextShipIndex >= SHIP_SIZES.length;
  }

  getShips() {
    return normalizeShips(this.ships);
  }

  setPreview(x, y) {
    if (this.hasPlacedAllShips()) {
      this.preview = null;
      return null;
    }

    const size = this.getCurrentShipSize();
    const candidate = {
      id: `preview-${this.nextShipIndex}`,
      size,
      cells: buildCellsFromStart(x, y, size, this.vertical)
    };

    this.preview = {
      cells: candidate.cells,
      valid: this.isPlacementValid(candidate)
    };

    return this.preview;
  }

  clearPreview() {
    this.preview = null;
  }

  placeCurrentShip(x, y) {
    if (this.hasPlacedAllShips()) {
      return false;
    }

    const ship = {
      id: `ship-${this.nextShipIndex}`,
      size: this.getCurrentShipSize(),
      cells: buildCellsFromStart(x, y, this.getCurrentShipSize(), this.vertical)
    };

    if (!this.isPlacementValid(ship)) {
      return false;
    }

    this.ships.push(ship);
    this.nextShipIndex += 1;
    this.preview = null;
    return true;
  }

  removeShipAt(x, y) {
    const shipIndex = this.ships.findIndex((ship) => ship.cells.some((cell) => cell.x === x && cell.y === y));
    if (shipIndex === -1) {
      return false;
    }

    this.ships = this.ships.slice(0, shipIndex);
    this.nextShipIndex = shipIndex;
    this.preview = null;
    return true;
  }

  isPlacementValid(candidateShip) {
    return validateFleetLocally([...this.ships, candidateShip]);
  }
}
