// Hub WebSocket: menyimpan koneksi overlay & dashboard, lalu broadcast event.
// Antrian alert (kirim 1-per-1, tunggu ack) menyusul di M4.
import type { ServerEvent, WsRole } from "../../../shared/types.ts";

interface Socket {
  send(data: string): void;
  readonly readyState: number;
}

const OPEN = 1;

interface Client {
  socket: Socket;
  role: WsRole;
}

export class WsHub {
  private clients = new Set<Client>();

  add(socket: Socket, role: WsRole): Client {
    const client: Client = { socket, role };
    this.clients.add(client);
    return client;
  }

  remove(client: Client): void {
    this.clients.delete(client);
  }

  /** Kirim event ke semua client (atau hanya role tertentu). */
  broadcast(event: ServerEvent, role?: WsRole): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (role && client.role !== role) continue;
      if (client.socket.readyState !== OPEN) continue;
      try {
        client.socket.send(payload);
      } catch {
        /* koneksi mati, biar dibersihkan saat event close */
      }
    }
  }

  count(role?: WsRole): number {
    if (!role) return this.clients.size;
    let n = 0;
    for (const c of this.clients) if (c.role === role) n += 1;
    return n;
  }
}
