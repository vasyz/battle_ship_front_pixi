import * as PIXI from "pixi.js";
import { COLORS } from "./constants.js";

export class UIOverlay {
  constructor({ width, height }) {
    this.container = new PIXI.Container();
    this.width = width;
    this.height = height;
    this.panelHeight = 162;
    this.isCompact = false;

    this.panel = new PIXI.Graphics();
    this.container.addChild(this.panel);

    this.title = this.createText("Battleship Multiplayer", 34, 700);
    this.title.position.set(40, 28);
    this.container.addChild(this.title);

    this.statusText = this.createText("Connecting...", 22, 600);
    this.statusText.position.set(40, 78);
    this.container.addChild(this.statusText);

    this.infoText = this.createText("", 16, 500);
    this.infoText.position.set(40, 118);
    this.container.addChild(this.infoText);

    this.contextText = this.createText("", 14, 500);
    this.contextText.position.set(40, 148);
    this.container.addChild(this.contextText);

    this.roomInput = this.createDomInput("Room ID");
    this.roomButton = this.createDomButton("Join Room");
    this.rotateButton = this.createDomButton("Rotate");
    this.readyButton = this.createDomButton("Ready");
    this.restartButton = this.createDomButton("Restart");
    this.boardToggleButton = this.createDomButton("Opponent Board");

    this.textLeft = 32;
    this.topPadding = 28;
    this.bottomPadding = 20;
    this.controlsTop = 0;
    this.controlsHeight = 0;

    this.renderPanel();
  }

  renderPanel() {
    this.panel.clear()
      .roundRect(20, 20, this.width - 40, this.panelHeight, 20)
      .fill({ color: COLORS.overlay, alpha: 0.78 })
      .stroke({ color: COLORS.accent, alpha: 0.25, width: 2 });
  }

  mountDom() {
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.display = "flex";
    wrapper.style.gap = "10px";
    wrapper.style.flexWrap = "wrap";
    wrapper.append(
      this.roomInput,
      this.roomButton,
      this.rotateButton,
      this.readyButton,
      this.restartButton,
      this.boardToggleButton
    );
    document.body.appendChild(wrapper);
    this.domWrapper = wrapper;
    this.applyResponsiveLayout(this.width, false);
    this.updateLayout();
  }

  destroy() {
    this.domWrapper?.remove();
  }

  createText(text, fontSize, fontWeight) {
    return new PIXI.Text({
      text,
      style: {
        fill: COLORS.text,
        fontSize,
        fontWeight,
        wordWrap: true,
        wordWrapWidth: Math.max(this.width - 80, 240)
      }
    });
  }

  createDomInput(placeholder) {
    const input = document.createElement("input");
    input.placeholder = placeholder;
    input.style.padding = "12px 14px";
    input.style.borderRadius = "10px";
    input.style.border = "1px solid rgba(255,255,255,0.2)";
    input.style.background = "rgba(10, 24, 36, 0.85)";
    input.style.color = "#eef6ff";
    input.style.outline = "none";
    input.style.fontSize = "16px";
    input.style.minWidth = "120px";
    return input;
  }

  createDomButton(label) {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.padding = "12px 14px";
    button.style.borderRadius = "10px";
    button.style.border = "none";
    button.style.background = "#4ecdc4";
    button.style.color = "#06212a";
    button.style.fontWeight = "700";
    button.style.cursor = "pointer";
    button.style.fontSize = "15px";
    button.style.touchAction = "manipulation";
    return button;
  }

  resize(width, height, isCompact) {
    this.width = width;
    this.height = height;
    this.isCompact = isCompact;
    this.panelHeight = isCompact ? 280 : 162;

    this.title.style.fontSize = isCompact ? 20 : 34;
    this.statusText.style.fontSize = isCompact ? 16 : 22;
    this.infoText.style.fontSize = isCompact ? 14 : 16;
    this.contextText.style.fontSize = isCompact ? 13 : 14;

    this.textLeft = isCompact ? 20 : 40;
    this.topPadding = 28;
    this.bottomPadding = isCompact ? 20 : 14;

    const wrapWidth = Math.max(this.width - 64, 220);
    this.title.style.wordWrapWidth = wrapWidth;
    this.statusText.style.wordWrapWidth = wrapWidth;
    this.infoText.style.wordWrapWidth = wrapWidth;
    this.contextText.style.wordWrapWidth = wrapWidth;

    this.applyResponsiveLayout(width, isCompact);
    this.updateLayout();
  }

  applyResponsiveLayout(width, isCompact) {
    if (!this.domWrapper) {
      return;
    }

    this.domWrapper.style.left = isCompact ? "32px" : "auto";
    this.domWrapper.style.right = isCompact ? "32px" : "42px";
    this.domWrapper.style.top = isCompact ? "196px" : "34px";
    this.domWrapper.style.justifyContent = isCompact ? "flex-start" : "flex-end";
    this.domWrapper.style.width = isCompact ? "calc(100% - 64px)" : `${Math.max(width - 84, 280)}px`;

    const controls = [this.roomInput, this.roomButton, this.rotateButton, this.readyButton, this.restartButton];
    for (const control of controls) {
      control.style.flex = isCompact ? "1 1 calc(50% - 10px)" : "0 0 auto";
    }

    this.boardToggleButton.style.flex = isCompact ? "1 1 100%" : "0 0 auto";
  }

  updateLayout() {
    const lineGap = this.isCompact ? 10 : 12;
    let currentTop = this.topPadding;

    this.title.position.set(this.textLeft, currentTop);
    currentTop += this.title.height + lineGap;

    this.statusText.position.set(this.textLeft, currentTop);
    currentTop += this.statusText.height + lineGap;

    this.infoText.position.set(this.textLeft, currentTop);
    currentTop += this.infoText.height + lineGap;

    this.contextText.position.set(this.textLeft, currentTop);
    currentTop += this.contextText.height;

    if (this.domWrapper) {
      this.controlsTop = currentTop + 16;
      this.domWrapper.style.top = `${this.controlsTop}px`;
      this.controlsHeight = this.measureControlsHeight();
    } else {
      this.controlsTop = currentTop;
      this.controlsHeight = 0;
    }

    this.panelHeight = Math.max(
      this.isCompact ? 280 : 162,
      this.controlsTop + this.controlsHeight + this.bottomPadding
    );

    this.renderPanel();
  }

  measureControlsHeight() {
    if (!this.domWrapper) {
      return 0;
    }

    return this.domWrapper.getBoundingClientRect().height;
  }

  getPanelBottom() {
    return 20 + this.panelHeight;
  }

  setStatus(text) {
    this.statusText.text = text;
    this.updateLayout();
  }

  setInfo(text) {
    this.infoText.text = text;
    this.updateLayout();
  }

  setContext(text) {
    this.contextText.text = text;
    this.updateLayout();
  }

  setPlacementControlsEnabled(enabled) {
    this.rotateButton.disabled = !enabled;
    this.rotateButton.style.opacity = enabled ? "1" : "0.45";
  }

  setReadyEnabled(enabled) {
    this.readyButton.disabled = !enabled;
    this.readyButton.style.opacity = enabled ? "1" : "0.45";
  }

  setRoomControlsEnabled(enabled) {
    this.roomInput.disabled = !enabled;
    this.roomButton.disabled = !enabled;
    this.roomInput.style.opacity = enabled ? "1" : "0.5";
    this.roomButton.style.opacity = enabled ? "1" : "0.5";
  }

  setRoomControlsVisible(visible) {
    this.roomInput.style.display = visible ? "inline-block" : "none";
    this.roomButton.style.display = visible ? "inline-block" : "none";
    this.updateLayout();
  }

  setRestartVisible(visible) {
    this.restartButton.style.display = visible ? "inline-block" : "none";
    this.updateLayout();
  }

  setBoardToggleVisible(visible) {
    this.boardToggleButton.style.display = visible ? "inline-block" : "none";
    this.updateLayout();
  }

  setBoardToggleLabel(text) {
    this.boardToggleButton.textContent = text;
  }
}
