// Hook WebSocket dashboard: auto-reconnect, panggil handler tiap event server.
import { useEffect, useRef, useState } from "react";
import type { ServerEvent } from "@shared/types";

export function useWs(onEvent: (e: ServerEvent) => void): boolean {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws?role=dashboard`);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) timer = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (e) => {
        try {
          handler.current(JSON.parse(e.data) as ServerEvent);
        } catch {
          /* ignore */
        }
      };
    }
    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, []);

  return connected;
}
