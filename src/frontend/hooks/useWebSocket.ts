import { useEffect, useRef, useCallback, useState } from "react";

export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function useWebSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const subscribersRef = useRef<Map<string, Set<(msg: WebSocketMessage) => void>>>(new Map());

  useEffect(() => {
    const wsUrl = url || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(message);

        // Notify all subscribers for this message type
        const handlers = subscribersRef.current.get(message.type);
        if (handlers) {
          handlers.forEach((handler) => handler(message));
        }

        // Also notify subscribers listening to all messages
        const allHandlers = subscribersRef.current.get("*");
        if (allHandlers) {
          allHandlers.forEach((handler) => handler(message));
        }
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        console.log("[WebSocket] Attempting to reconnect...");
        // This will be handled by the next effect cycle
      }, 3000);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [url]);

  const subscribe = useCallback(
    (messageType: string, handler: (msg: WebSocketMessage) => void) => {
      if (!subscribersRef.current.has(messageType)) {
        subscribersRef.current.set(messageType, new Set());
      }
      subscribersRef.current.get(messageType)!.add(handler);

      // Return unsubscribe function
      return () => {
        subscribersRef.current.get(messageType)?.delete(handler);
      };
    },
    []
  );

  const send = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Not connected, cannot send message");
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    subscribe,
    send,
  };
}
