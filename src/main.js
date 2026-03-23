import * as PIXI from "pixi.js";
import { BrowserSession } from "./BrowserSession.js";
import { GameScene } from "./GameScene.js";
import { NetworkClient } from "./NetworkClient.js";

async function bootstrap() {
  const session = new BrowserSession();
  const launchContext = await session.initialize();
  const roomKey = session.getRoomKey();

  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    backgroundAlpha: 0
  });

  document.getElementById("app").appendChild(app.canvas);

  const networkClient = new NetworkClient({
    connectionMetadata: session.getConnectionMetadata()
  });

  const scene = new GameScene(app, networkClient, {
    autoJoin: false,
    roomKey,
    launchContext,
    session,
    contextLabel: `Browser room: ${roomKey}`
  });

  try {
    await networkClient.connect();
  } catch (error) {
    scene.ui.setStatus("Server connection failed");
    scene.ui.setInfo(error.message ?? `Unknown error. WS URL: ${networkClient.url}`);
  }
}

bootstrap();
