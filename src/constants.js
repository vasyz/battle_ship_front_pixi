export const GRID_SIZE = 10;
export const CELL_SIZE = 38;
export const BOARD_PIXEL_SIZE = GRID_SIZE * CELL_SIZE;

export const SHIP_SIZES = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

export const COLORS = {
  bgPanel: 0x102131,
  boardFill: 0x17354f,
  boardLine: 0x7eb8e6,
  ship: 0x9fbad0,
  shipPreviewValid: 0x78d08b,
  shipPreviewInvalid: 0xe16d6d,
  hit: 0xff6a4f,
  miss: 0xb8d7ef,
  sunk: 0xffc857,
  text: 0xf4f8fc,
  accent: 0x4ecdc4,
  danger: 0xff6b6b,
  overlay: 0x08111a
};

export const CLIENT_STATE = {
  LOBBY: "lobby",
  PLACEMENT: "placement",
  WAITING_PLACEMENT: "waiting_placement",
  BATTLE: "battle",
  GAME_OVER: "game_over"
};
