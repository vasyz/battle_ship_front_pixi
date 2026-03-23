export class NetworkClient {
  constructor(options = {}) {
    this.socket = null;
    this.handlers = new Map();
    this.options = options;
    this.url = this.resolveUrl();
  }

  resolveUrl() {
    if (this.options.wsUrl) {
      return this.options.wsUrl;
    }

    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }

    const isSecure = window.location.protocol === "https:";
    const isViteDevServer = window.location.port === "5173";

    if (isViteDevServer) {
      return `${isSecure ? "wss" : "ws"}://${window.location.hostname || "localhost"}:3000`;
    }

    const host = window.location.host || "localhost:3000";
    return `${isSecure ? "wss" : "ws"}://${host}`;
  }

  async connect() {
    const url = this.buildConnectionUrl();
    this.socket = new WebSocket(url);
    this.bindSocketEvents(url);
    await this.awaitSocketOpen(url);
  }

  buildConnectionUrl() {
    const url = new URL(this.url);
    const connectionMetadata = this.options.connectionMetadata ?? {};

    for (const [key, value] of Object.entries(connectionMetadata)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  bindSocketEvents(url) {
    this.socket.addEventListener("message", (event) => this.handleMessage(event));
    this.socket.addEventListener("close", (event) => {
      this.emit("socket_closed", {
        code: event.code,
        reason: event.reason,
        url
      });
    });
  }

  awaitSocketOpen(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const socket = this.socket;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        socket?.removeEventListener("open", handleOpen);
        socket?.removeEventListener("error", handleError);
        socket?.removeEventListener("close", handleCloseWhileConnecting);
      };

      const fail = (message) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(new Error(message));
      };

      const handleOpen = () => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve();
      };

      const handleError = () => {
        fail(`WebSocket error while connecting to ${url}`);
      };

      const handleCloseWhileConnecting = (event) => {
        const reason = event.reason ? ` Reason: ${event.reason}` : "";
        fail(`WebSocket closed before open. Code: ${event.code}.${reason} URL: ${url}`);
      };

      const timeoutId = window.setTimeout(() => {
        fail(`WebSocket connection timed out: ${url}`);
        socket?.close();
      }, 8000);

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("error", handleError);
      socket.addEventListener("close", handleCloseWhileConnecting);
    });
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.emit(message.type, message.payload ?? {});
      this.emit("message", message);
    } catch {
      this.emit("error", { message: "Invalid server message format." });
    }
  }

  on(type, handler) {
    const entries = this.handlers.get(type) ?? [];
    entries.push(handler);
    this.handlers.set(type, entries);
  }

  emit(type, payload) {
    const entries = this.handlers.get(type) ?? [];
    for (const handler of entries) {
      handler(payload);
    }
  }

  send(type, payload = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify({ type, payload }));
  }
}
