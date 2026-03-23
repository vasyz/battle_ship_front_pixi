function readQueryContext() {
  const params = new URLSearchParams(window.location.search);
  return {
    instanceId: params.get("instance_id") ?? params.get("instanceId") ?? null,
    channelId: params.get("channel_id") ?? params.get("channelId") ?? null,
    guildId: params.get("guild_id") ?? params.get("guildId") ?? null,
    roomId: params.get("roomId") ?? null
  };
}

function sanitizePart(value, fallback = "unknown") {
  if (!value) {
    return fallback;
  }

  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

export class BrowserSession {
  constructor() {
    this.queryContext = readQueryContext();
    this.launchContext = null;
  }

  async initialize() {
    this.launchContext = this.buildContext();
    return this.launchContext;
  }

  buildContext() {
    const browserUserId = window.localStorage.getItem("battleship_user_id") ?? crypto.randomUUID();
    window.localStorage.setItem("battleship_user_id", browserUserId);

    return {
      source: "browser",
      channelId: this.queryContext.channelId,
      guildId: this.queryContext.guildId,
      instanceId: this.queryContext.instanceId,
      userId: browserUserId,
      username: "Browser Player"
    };
  }

  getRoomKey() {
    const fallbackRoom = this.queryContext.roomId ||
      import.meta.env.VITE_FALLBACK_ROOM ||
      "battleship-fallback-room";

    const instanceId = this.launchContext?.instanceId ?? this.queryContext.instanceId;
    if (instanceId) {
      return `activity:${sanitizePart(instanceId)}`;
    }

    const channelId = this.launchContext?.channelId ?? this.queryContext.channelId;
    if (channelId) {
      const guildId = this.launchContext?.guildId ?? this.queryContext.guildId ?? "dm";
      return `channel:${sanitizePart(guildId)}:${sanitizePart(channelId)}`;
    }

    return `fallback:${sanitizePart(fallbackRoom)}`;
  }

  getConnectionMetadata() {
    return {
      roomKey: this.getRoomKey(),
      userId: this.launchContext?.userId ?? null,
      username: this.launchContext?.username ?? "Guest",
      channelId: this.launchContext?.channelId ?? null,
      guildId: this.launchContext?.guildId ?? null,
      instanceId: this.launchContext?.instanceId ?? null,
      source: this.launchContext?.source ?? "browser"
    };
  }

  async setRichPresence() {}
}
