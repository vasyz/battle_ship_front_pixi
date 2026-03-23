import * as PIXI from "pixi.js";
import { BoardRenderer } from "./BoardRenderer.js";
import { BOARD_PIXEL_SIZE, CLIENT_STATE, COLORS } from "./constants.js";
import { ShipPlacementController } from "./ShipPlacementController.js";
import { UIOverlay } from "./UIOverlay.js";

export class GameScene {
  constructor(app, networkClient, activityContext) {
    this.app = app;
    this.networkClient = networkClient;
    this.activityContext = activityContext;
    this.state = CLIENT_STATE.LOBBY;
    this.roomId = null;
    this.playerId = null;
    this.currentTurnPlayerId = null;
    this.youPlacedShips = false;
    this.opponentPlacedShips = false;
    this.youReady = false;
    this.opponentReady = false;
    this.placementSubmitted = false;
    this.mobileBoardView = "player";

    this.playerBoardState = { ships: [], hits: [], misses: [], sunkCells: [] };
    this.opponentBoardState = { ships: [], hits: [], misses: [], sunkCells: [] };
    this.shipPlacement = new ShipPlacementController();

    this.root = new PIXI.Container();
    this.app.stage.addChild(this.root);

    this.createScene();
    this.bindNetwork();
    this.renderPlacementInfo();
    this.renderAll();
  }

  createScene() {
    this.ui = new UIOverlay({ width: window.innerWidth, height: window.innerHeight });
    this.ui.mountDom();
    this.ui.setRoomControlsVisible(!this.activityContext.autoJoin);
    this.ui.setBoardToggleVisible(false);
    this.ui.setContext(this.activityContext.contextLabel);
    this.root.addChild(this.ui.container);

    this.playerBoard = new BoardRenderer({ title: "Your Board", x: 0, y: 0, interactive: true });
    this.enemyBoard = new BoardRenderer({ title: "Opponent Board", x: 0, y: 0, interactive: true });

    this.root.addChild(this.playerBoard.container, this.enemyBoard.container);

    this.legend = new PIXI.Text({
      text: "Place ships on the left board. Fire on the right board during battle.",
      style: { fill: COLORS.text, fontSize: 18, wordWrap: true, wordWrapWidth: this.app.screen.width - 80 }
    });
    this.root.addChild(this.legend);

    this.handleResize = () => this.layoutScene();
    window.addEventListener("resize", this.handleResize);
    this.layoutScene();

    this.playerBoard.onCellHover((cell) => {
      if (this.state !== CLIENT_STATE.PLACEMENT) {
        return;
      }
      this.shipPlacement.setPreview(cell.x, cell.y);
      this.renderAll();
    });

    this.playerBoard.onCellOut(() => {
      if (this.state !== CLIENT_STATE.PLACEMENT) {
        return;
      }
      this.shipPlacement.clearPreview();
      this.renderAll();
    });

    this.playerBoard.onCellClick((cell) => {
      if (this.state !== CLIENT_STATE.PLACEMENT) {
        return;
      }

      const removed = this.shipPlacement.removeShipAt(cell.x, cell.y);
      if (removed) {
        this.playerBoardState.ships = this.shipPlacement.getShips();
        this.youPlacedShips = this.shipPlacement.hasPlacedAllShips();
        this.youReady = false;
        this.placementSubmitted = false;
        this.ui.setStatus("Adjust your fleet");
        this.renderPlacementInfo();
        this.renderAll();
        return;
      }

      const placed = this.shipPlacement.placeCurrentShip(cell.x, cell.y);
      if (placed) {
        this.playerBoardState.ships = this.shipPlacement.getShips();
        this.youPlacedShips = this.shipPlacement.hasPlacedAllShips();
        this.placementSubmitted = false;
        this.renderPlacementInfo();
      }
      this.renderAll();
    });

    this.enemyBoard.onCellClick((cell) => {
      if (this.state !== CLIENT_STATE.BATTLE || this.currentTurnPlayerId !== this.playerId) {
        return;
      }

      const alreadyShot = this.opponentBoardState.hits.some((entry) => entry.x === cell.x && entry.y === cell.y) ||
        this.opponentBoardState.misses.some((entry) => entry.x === cell.x && entry.y === cell.y);
      if (alreadyShot) {
        return;
      }

      this.networkClient.send("shoot", cell);
    });

    this.ui.roomButton.addEventListener("click", () => {
      this.networkClient.send("create_or_join", {
        roomId: this.ui.roomInput.value.trim() || undefined
      });
    });

    this.ui.rotateButton.addEventListener("click", () => {
      this.shipPlacement.rotate();
      this.renderPlacementInfo();
    });

    this.ui.readyButton.addEventListener("click", () => {
      if (!this.shipPlacement.hasPlacedAllShips()) {
        this.ui.setInfo("Place all 10 ships first.");
        return;
      }

      this.playerBoardState.ships = this.shipPlacement.getShips();
      this.networkClient.send("place_ships", { ships: this.playerBoardState.ships });
      this.networkClient.send("player_ready", {});
      this.placementSubmitted = true;
      this.ui.setPlacementControlsEnabled(false);
      this.ui.setStatus("Submitting fleet...");
    });

    this.ui.boardToggleButton.addEventListener("click", () => {
      this.mobileBoardView = this.mobileBoardView === "player" ? "enemy" : "player";
      this.syncBoardVisibility();
      this.layoutScene();
      this.renderAll();
    });

    this.ui.restartButton.addEventListener("click", () => {
      this.resetLocalBoards();
      this.networkClient.send("restart_request", {});
    });

    this.ui.setPlacementControlsEnabled(false);
    this.ui.setReadyEnabled(false);
    this.ui.setRestartVisible(false);
  }

  layoutScene() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isCompact = width < 900;
    const isVeryShort = height < 760;
    const topSpacing = isCompact ? 20 : 32;
    const availableWidth = width - (isCompact ? 32 : 96);
    this.ui.resize(width, height, isCompact);
    this.syncBoardVisibility();

    const contentTop = this.ui.getPanelBottom() + topSpacing;
    const legendSpace = isCompact ? 56 : 72;
    const availableHeight = Math.max(height - contentTop - legendSpace, BOARD_PIXEL_SIZE * 0.75);
    const boardGap = isCompact ? 20 : 42;
    const layoutWidth = isCompact ? BOARD_PIXEL_SIZE : (BOARD_PIXEL_SIZE * 2) + boardGap;
    const layoutHeight = BOARD_PIXEL_SIZE;
    const scale = Math.max(0.58, Math.min(1, availableWidth / layoutWidth, availableHeight / layoutHeight));
    const scaledBoardSize = BOARD_PIXEL_SIZE * scale;

    this.playerBoard.container.scale.set(scale);
    this.enemyBoard.container.scale.set(scale);
    this.playerBoard.title.style.fontSize = isCompact ? 20 : 22;
    this.enemyBoard.title.style.fontSize = isCompact ? 20 : 22;

    if (isCompact) {
      const boardX = Math.max((width - scaledBoardSize) / 2, 16);
      this.playerBoard.container.position.set(boardX, contentTop);
      this.enemyBoard.container.position.set(boardX, contentTop);
      this.legend.style.fontSize = isVeryShort ? 14 : 16;
      this.legend.style.wordWrapWidth = width - 32;
      this.legend.position.set(16, contentTop + scaledBoardSize + 16);
    } else {
      const startX = Math.max((width - ((scaledBoardSize * 2) + (boardGap * scale))) / 2, 48);
      this.playerBoard.container.position.set(startX, contentTop);
      this.enemyBoard.container.position.set(startX + scaledBoardSize + (boardGap * scale), contentTop);
      this.legend.style.fontSize = 18;
      this.legend.style.wordWrapWidth = width - 96;
      this.legend.position.set(startX, contentTop + scaledBoardSize + 28);
    }

    const contentBottom = this.legend.position.y + this.legend.height + 24;
    const sceneHeight = Math.max(height, Math.ceil(contentBottom));
    this.app.renderer.resize(width, sceneHeight);
    const appElement = document.getElementById("app");
    if (appElement) {
      appElement.style.height = `${sceneHeight}px`;
    }
  }

  syncBoardVisibility() {
    const isCompact = window.innerWidth < 900;
    const showToggle = isCompact && this.state !== CLIENT_STATE.PLACEMENT && this.state !== CLIENT_STATE.LOBBY;

    if (this.state === CLIENT_STATE.PLACEMENT) {
      this.mobileBoardView = "player";
    }

    this.ui.setBoardToggleVisible(showToggle);
    this.ui.setBoardToggleLabel(this.mobileBoardView === "player" ? "Opponent Board" : "Your Board");

    if (!isCompact) {
      this.playerBoard.container.visible = true;
      this.enemyBoard.container.visible = true;
      return;
    }

    this.playerBoard.container.visible = this.mobileBoardView === "player";
    this.enemyBoard.container.visible = this.mobileBoardView === "enemy";
  }

  bindNetwork() {
    this.networkClient.on("connected", ({ playerId, roomKey, username }) => {
      this.playerId = playerId;
      this.ui.setStatus(this.activityContext.autoJoin ? "Connecting to activity match..." : "Connected. Join a room.");
      this.ui.setInfo(`Player: ${username}. Room key: ${roomKey ?? this.activityContext.roomKey}`);
      this.updatePresence();

      if (this.activityContext.autoJoin) {
        this.networkClient.send("create_or_join", { roomId: roomKey ?? this.activityContext.roomKey });
      }
    });

    this.networkClient.on("room_joined", ({ roomId, playerIndex, playersInRoom }) => {
      if (this.roomId) {
        this.resetLocalBoards();
      }

      this.roomId = roomId;
      this.state = CLIENT_STATE.PLACEMENT;
      this.mobileBoardView = "player";
      this.ui.setRoomControlsEnabled(false);
      this.ui.setRoomControlsVisible(false);
      this.ui.setPlacementControlsEnabled(true);
      this.ui.setRestartVisible(false);
      this.syncReadyButton();
      this.ui.setStatus(playersInRoom < 2 && playerIndex === 0 ? "Waiting for the second player" : "Place your fleet");
      this.updatePresence();
      this.renderPlacementInfo();
      this.layoutScene();
      this.renderAll();
    });

    this.networkClient.on("waiting_for_opponent", () => {
      if (this.state === CLIENT_STATE.PLACEMENT) {
        this.ui.setStatus("Waiting for the second player");
        this.updatePresence();
      }
    });

    this.networkClient.on("placement_accepted", ({ youReady, youPlacedShips, opponentReady, opponentPlacedShips }) => {
      this.youReady = youReady;
      this.youPlacedShips = youPlacedShips;
      this.opponentReady = opponentReady;
      this.opponentPlacedShips = opponentPlacedShips;

      if (this.youReady) {
        this.state = opponentReady ? CLIENT_STATE.BATTLE : CLIENT_STATE.WAITING_PLACEMENT;
        this.ui.setPlacementControlsEnabled(false);
        this.ui.setStatus(opponentReady ? "Preparing battle..." : "Waiting for opponent ready");
      } else {
        this.state = CLIENT_STATE.PLACEMENT;
        this.ui.setPlacementControlsEnabled(true);
        this.ui.setStatus(opponentPlacedShips ? "Opponent finished placement" : "Place your fleet");
      }

      this.syncReadyButton();
      this.updatePresence();
      this.layoutScene();
    });

    this.networkClient.on("placement_error", ({ message }) => {
      this.ui.setInfo(message);
      this.state = CLIENT_STATE.PLACEMENT;
      this.ui.setPlacementControlsEnabled(true);
      this.placementSubmitted = false;
      this.syncReadyButton();
      this.updatePresence();
      this.layoutScene();
    });

    this.networkClient.on("battle_started", ({ currentTurnPlayerId }) => {
      this.state = CLIENT_STATE.BATTLE;
      this.currentTurnPlayerId = currentTurnPlayerId;
      this.ui.setStatus(currentTurnPlayerId === this.playerId ? "Your turn" : "Opponent turn");
      this.ui.setInfo("Battle started.");
      this.mobileBoardView = currentTurnPlayerId === this.playerId ? "enemy" : "player";
      this.syncBoardVisibility();
      this.updatePresence();
      this.layoutScene();
      this.renderAll();
    });

    this.networkClient.on("turn_changed", ({ currentTurnPlayerId }) => {
      this.currentTurnPlayerId = currentTurnPlayerId;
      if (this.state === CLIENT_STATE.BATTLE) {
        this.ui.setStatus(currentTurnPlayerId === this.playerId ? "Your turn" : "Opponent turn");
        this.updatePresence();
      }
    });

    this.networkClient.on("shot_result", (payload) => {
      this.applyShotResult(this.opponentBoardState, payload);
      this.currentTurnPlayerId = payload.nextTurnPlayerId;
      if (payload.gameOver) {
        this.finishGame(payload.winnerId === this.playerId);
      } else {
        this.ui.setStatus(this.currentTurnPlayerId === this.playerId ? "Your turn" : "Opponent turn");
        this.updatePresence();
      }
      this.renderAll();
    });

    this.networkClient.on("opponent_shot", (payload) => {
      this.applyShotResult(this.playerBoardState, payload);
      this.currentTurnPlayerId = payload.nextTurnPlayerId;
      if (!payload.gameOver) {
        this.ui.setStatus(this.currentTurnPlayerId === this.playerId ? "Your turn" : "Opponent turn");
        this.updatePresence();
      }
      this.renderAll();
    });

    this.networkClient.on("ship_sunk", ({ target, cells }) => {
      const board = target === "opponent" ? this.opponentBoardState : this.playerBoardState;
      for (const cell of cells) {
        if (!board.sunkCells.some((entry) => entry.x === cell.x && entry.y === cell.y)) {
          board.sunkCells.push(cell);
        }
      }
      this.renderAll();
    });

    this.networkClient.on("game_over", ({ winnerId, reason }) => {
      this.ui.setInfo(reason ?? "");
      this.finishGame(winnerId === this.playerId);
    });

    this.networkClient.on("error", ({ message }) => {
      this.ui.setInfo(message);
    });

    this.networkClient.on("socket_closed", ({ code, reason, url } = {}) => {
      this.ui.setStatus("Connection closed");
      this.ui.setInfo(
        code
          ? `WS closed. Code: ${code}${reason ? `. Reason: ${reason}` : ""}${url ? `. URL: ${url}` : ""}`
          : "WebSocket connection closed."
      );
      this.ui.setPlacementControlsEnabled(false);
      this.ui.setRoomControlsEnabled(false);
      this.ui.setReadyEnabled(false);
      this.updatePresence("Disconnected");
    });
  }

  resetLocalBoards() {
    this.shipPlacement.reset();
    this.playerBoardState = { ships: [], hits: [], misses: [], sunkCells: [] };
    this.opponentBoardState = { ships: [], hits: [], misses: [], sunkCells: [] };
    this.state = CLIENT_STATE.PLACEMENT;
    this.currentTurnPlayerId = null;
    this.youPlacedShips = false;
    this.opponentPlacedShips = false;
    this.youReady = false;
    this.opponentReady = false;
    this.placementSubmitted = false;
    this.mobileBoardView = "player";
    this.ui.setPlacementControlsEnabled(true);
    this.ui.setRoomControlsVisible(false);
    this.syncReadyButton();
    this.renderPlacementInfo();
    this.updatePresence();
    this.layoutScene();
    this.renderAll();
  }

  applyShotResult(board, payload) {
    const target = { x: payload.x, y: payload.y };
    if (payload.result === "miss") {
      board.misses.push(target);
    } else {
      board.hits.push(target);
    }

    if (payload.sunkShipCells) {
      for (const cell of payload.sunkShipCells) {
        if (!board.sunkCells.some((entry) => entry.x === cell.x && entry.y === cell.y)) {
          board.sunkCells.push(cell);
        }
      }
    }
  }

  finishGame(isWinner) {
    this.state = CLIENT_STATE.GAME_OVER;
    this.ui.setStatus(isWinner ? "You won" : "You lost");
    this.ui.setRestartVisible(true);
    this.updatePresence(isWinner ? "Victory" : "Defeat");
    this.renderAll();
  }

  renderPlacementInfo() {
    const nextShip = this.shipPlacement.getCurrentShipSize();
    if (nextShip) {
      this.ui.setInfo(`Current ship: ${nextShip}. Orientation: ${this.shipPlacement.vertical ? "vertical" : "horizontal"}`);
    } else {
      this.youPlacedShips = true;
      this.syncReadyButton();
      this.ui.setInfo("Fleet ready. Press Ready, or tap a placed ship to reposition from that point.");
    }
  }

  syncReadyButton() {
    const canReady = this.state !== CLIENT_STATE.BATTLE &&
      this.state !== CLIENT_STATE.GAME_OVER &&
      this.youPlacedShips &&
      !this.youReady;
    this.ui.setReadyEnabled(canReady);
  }

  updatePresence(overrideState) {
    const presenceState = overrideState ?? this.ui.statusText.text;
    this.activityContext.session?.setRichPresence({
      details: "Battleship 10x10",
      state: presenceState
    });
  }

  renderAll() {
    const preview = this.state === CLIENT_STATE.PLACEMENT ? this.shipPlacement.preview : null;

    this.playerBoard.renderBoard({
      ships: this.playerBoardState.ships,
      hits: this.playerBoardState.hits,
      misses: this.playerBoardState.misses,
      sunkCells: this.playerBoardState.sunkCells,
      hiddenShips: false,
      preview
    });

    this.enemyBoard.renderBoard({
      ships: [],
      hits: this.opponentBoardState.hits,
      misses: this.opponentBoardState.misses,
      sunkCells: this.opponentBoardState.sunkCells,
      hiddenShips: true,
      preview: null
    });
  }

  destroy() {
    window.removeEventListener("resize", this.handleResize);
    this.ui.destroy();
  }
}
