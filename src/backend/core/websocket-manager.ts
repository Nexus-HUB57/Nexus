import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";

export interface WebSocketMessage {
  type: "brain_pulse" | "ecosystem_metrics" | "agent_status" | "transaction" | "decision";
  data: Record<string, unknown>;
  timestamp: Date;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.setupConnectionHandler();
  }

  private setupConnectionHandler(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = nanoid(8);
      this.clients.set(clientId, ws);

      console.log(`[WebSocket] Client ${clientId} connected. Total clients: ${this.clients.size}`);

      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(clientId, data);
        } catch (error) {
          console.error(`[WebSocket] Error parsing message from ${clientId}:`, error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        this.subscriptions.forEach((subs) => subs.delete(clientId));
        console.log(`[WebSocket] Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
      });

  ws.on("error", (error: Error) => {
    console.error(`[WebSocket] Error for client ${clientId}:`, error);
  });

      // Send welcome message
      ws.send(JSON.stringify({ type: "connected", clientId, timestamp: new Date() }));
    });
  }

  private handleClientMessage(clientId: string, data: any): void {
    if (data.type === "subscribe") {
      const channel = data.channel;
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }
      this.subscriptions.get(channel)!.add(clientId);
      console.log(`[WebSocket] Client ${clientId} subscribed to ${channel}`);
    } else if (data.type === "unsubscribe") {
      const channel = data.channel;
      this.subscriptions.get(channel)?.delete(clientId);
      console.log(`[WebSocket] Client ${clientId} unsubscribed from ${channel}`);
    }
  }

  public broadcast(message: WebSocketMessage): void {
    const channel = `${message.type}:all`;
    const subscribers = this.subscriptions.get(channel) || new Set();

    const payload = JSON.stringify(message);
    subscribers.forEach((clientId) => {
      const ws = this.clients.get(clientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  public broadcastToChannel(channel: string, message: WebSocketMessage): void {
    const subscribers = this.subscriptions.get(channel) || new Set();

    const payload = JSON.stringify(message);
    subscribers.forEach((clientId) => {
      const ws = this.clients.get(clientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  public sendToClient(clientId: string, message: WebSocketMessage): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getSubscriberCount(channel: string): number {
    return this.subscriptions.get(channel)?.size || 0;
  }

  public close(): void {
    this.wss.close();
    this.clients.clear();
    this.subscriptions.clear();
  }
}

// Global instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(httpServer: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(httpServer);
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error("WebSocket manager not initialized");
  }
  return wsManager;
}
