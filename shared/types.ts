// Tipe yang dipakai bersama server, overlay, dan dashboard.

/** Pesan chat yang sudah dinormalisasi dari masterchat. */
export interface ChatMessage {
  /** ID penonton dari YouTube — stabil, dipakai sebagai kunci point. */
  authorChannelId: string;
  /** Nama tampilan penonton saat pesan dikirim. */
  name: string;
  /** Isi pesan sebagai teks polos (emoji jadi shortcut :emoji:). */
  text: string;
  /** Epoch milidetik saat pesan dikirim. */
  timestamp: number;
  isOwner: boolean;
  isModerator: boolean;
  isMember: boolean;
  /** Nominal SuperChat dalam string (mis. "Rp15.000") kalau ada. */
  superChat?: string;
  /** Level/badge penonton (dihitung server dari total point). */
  level?: { name: string; color: string };
}

/** Info stream yang sedang dipantau. */
export interface MonitorStatus {
  monitoring: boolean;
  videoId?: string;
  title?: string;
  hostChannelId?: string;
  messageCount: number;
  startedAt?: number;
}

/** Event WebSocket: server -> client. */
export type ServerEvent =
  | { type: "status"; data: MonitorStatus }
  | { type: "chat"; data: ChatMessage }
  | { type: "points"; data: { authorChannelId: string; name: string; points: number } }
  | { type: "alert"; data: AlertPayload }
  | { type: "sound"; data: { url: string; imageUrl?: string | null } }
  | { type: "soundStop" }
  | { type: "skip" }
  | { type: "reset" }
  | { type: "error"; data: { message: string } };

/** Event WebSocket: client -> server. */
export type ClientEvent =
  | { type: "ready" }
  | { type: "alert:shown"; data: { id: number } };

/** Data alert yang dikirim ke overlay OBS. */
export interface AlertPayload {
  id: number;
  name: string;
  message: string;
  template: AlertTemplate;
}

export interface AlertTemplate {
  id: number;
  name: string;
  /** Kata pemicu di chat (mis. "!alert", "!clip"). Kosong = tak bisa dipicu penonton. */
  command: string;
  /** Biaya point untuk memicu alert ini. */
  cost: number;
  imageUrl?: string;
  /** GIF besar yang tampil seperti alert video (posisi dominan), terpisah dari imageUrl. */
  gifUrl?: string;
  soundUrl?: string;
  durationMs: number;
  animation: "slide" | "pop" | "fade";
  position: "top" | "center" | "bottom";
  textColor: string;
  bgColor: string;
  ttsEnabled: boolean;
  /** ID video YouTube yang diputar saat alert muncul (opsional). */
  youtubeId?: string;
  /** Detik mulai video YouTube. */
  youtubeStart?: number;
}

export type WsRole = "overlay" | "dashboard" | "chat";
