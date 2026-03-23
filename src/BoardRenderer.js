import * as PIXI from "pixi.js";
import { BOARD_PIXEL_SIZE, CELL_SIZE, COLORS, GRID_SIZE } from "./constants.js";

export class BoardRenderer {
  constructor({ title, x, y, interactive = false }) {
    this.container = new PIXI.Container();
    this.container.position.set(x, y);

    this.background = new PIXI.Graphics();
    this.grid = new PIXI.Graphics();
    this.cellsLayer = new PIXI.Container();
    this.overlayLayer = new PIXI.Container();

    this.container.addChild(this.background, this.grid, this.cellsLayer, this.overlayLayer);

    this.interactiveCells = [];
    this.pointerHandlers = { click: null, move: null, out: null };

    this.title = new PIXI.Text({
      text: title,
      style: {
        fill: COLORS.text,
        fontSize: 22,
        fontWeight: "700"
      }
    });
    this.title.position.set(0, -34);
    this.container.addChild(this.title);

    this.drawBoardBase();
    this.setInteractive(interactive);
  }

  drawBoardBase() {
    this.background.clear()
      .roundRect(-14, -14, BOARD_PIXEL_SIZE + 28, BOARD_PIXEL_SIZE + 28, 18)
      .fill({ color: COLORS.bgPanel, alpha: 0.92 })
      .stroke({ color: COLORS.boardLine, alpha: 0.25, width: 2 });

    this.grid.clear()
      .rect(0, 0, BOARD_PIXEL_SIZE, BOARD_PIXEL_SIZE)
      .fill({ color: COLORS.boardFill, alpha: 0.95 });

    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const offset = i * CELL_SIZE;
      this.grid.moveTo(offset, 0).lineTo(offset, BOARD_PIXEL_SIZE);
      this.grid.moveTo(0, offset).lineTo(BOARD_PIXEL_SIZE, offset);
    }

    this.grid.stroke({ color: COLORS.boardLine, width: 1, alpha: 0.65 });
  }

  setInteractive(enabled) {
    this.overlayLayer.removeChildren();
    this.interactiveCells = [];

    if (!enabled) {
      return;
    }

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const hitArea = new PIXI.Graphics();
        hitArea.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE).fill({ color: 0xffffff, alpha: 0.001 });
        hitArea.eventMode = "static";
        hitArea.cursor = "pointer";
        hitArea.on("pointertap", () => this.pointerHandlers.click?.({ x, y }));
        hitArea.on("pointerover", () => this.pointerHandlers.move?.({ x, y }));
        hitArea.on("pointerout", () => this.pointerHandlers.out?.());
        this.overlayLayer.addChild(hitArea);
        this.interactiveCells.push(hitArea);
      }
    }
  }

  onCellClick(handler) {
    this.pointerHandlers.click = handler;
  }

  onCellHover(handler) {
    this.pointerHandlers.move = handler;
  }

  onCellOut(handler) {
    this.pointerHandlers.out = handler;
  }

  renderBoard({ ships = [], hits = [], misses = [], sunkCells = [], hiddenShips = false, preview = null }) {
    this.cellsLayer.removeChildren();

    const occupiedCells = new Set();
    if (!hiddenShips) {
      for (const ship of ships) {
        for (const cell of ship.cells) {
          occupiedCells.add(`${cell.x},${cell.y}`);
          this.cellsLayer.addChild(this.createCellRect(cell.x, cell.y, COLORS.ship, 0.9));
        }
      }
    }

    for (const cell of sunkCells) {
      this.cellsLayer.addChild(this.createCellRect(cell.x, cell.y, COLORS.sunk, 0.95, 6));
    }

    for (const cell of misses) {
      this.cellsLayer.addChild(this.createMarker(cell.x, cell.y, COLORS.miss, "miss"));
    }

    for (const cell of hits) {
      const color = sunkCells.some((sunk) => sunk.x === cell.x && sunk.y === cell.y) ? COLORS.sunk : COLORS.hit;
      this.cellsLayer.addChild(this.createMarker(cell.x, cell.y, color, "hit"));
    }

    if (preview) {
      for (const cell of preview.cells) {
        this.cellsLayer.addChild(
          this.createCellRect(
            cell.x,
            cell.y,
            preview.valid ? COLORS.shipPreviewValid : COLORS.shipPreviewInvalid,
            0.45,
            5
          )
        );
      }
    }
  }

  createCellRect(x, y, color, alpha = 1, radius = 4) {
    const graphic = new PIXI.Graphics();
    graphic
      .roundRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, radius)
      .fill({ color, alpha });
    return graphic;
  }

  createMarker(x, y, color, type) {
    const marker = new PIXI.Graphics();
    const centerX = x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = y * CELL_SIZE + CELL_SIZE / 2;

    if (type === "miss") {
      marker.circle(centerX, centerY, 5).fill({ color, alpha: 1 });
    } else {
      marker.moveTo(centerX - 10, centerY - 10)
        .lineTo(centerX + 10, centerY + 10)
        .moveTo(centerX + 10, centerY - 10)
        .lineTo(centerX - 10, centerY + 10)
        .stroke({ color, width: 4, alpha: 1 });
    }

    return marker;
  }
}
