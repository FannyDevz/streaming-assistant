// Wrapper tipis di atas masterchat: baca live chat, keluarkan ChatMessage
// yang sudah dinormalisasi. Interface ini sengaja kecil supaya suatu saat bisa
// diganti implementasi lain (mis. YouTube Data API resmi) tanpa mengubah engine.
import { Masterchat, stringify, type AddChatItemAction, type Action } from "masterchat";
import type { ChatMessage, MonitorStatus } from "../../../shared/types.ts";

export interface SuperChatEvent {
  authorChannelId: string;
  name: string;
  amount: string;
  message: string;
}
export interface MemberEvent {
  authorChannelId: string;
  name: string;
  level: string;
}

export interface ChatReaderHandlers {
  onMessage: (msg: ChatMessage) => void;
  onSuperChat?: (e: SuperChatEvent) => void;
  onMember?: (e: MemberEvent) => void;
  onEnd?: (reason: string) => void;
  onError?: (err: Error) => void;
}

export class ChatReader {
  private mc: Masterchat | null = null;
  private status: MonitorStatus = { monitoring: false, messageCount: 0 };

  constructor(private readonly handlers: ChatReaderHandlers) {}

  /** Mulai memantau live dari videoId atau URL YouTube. */
  async start(videoIdOrUrl: string): Promise<MonitorStatus> {
    this.stop();

    const mc = await Masterchat.init(videoIdOrUrl);
    if (mc.isLive === false) {
      throw new Error(
        "Video ini bukan siaran langsung yang aktif (mungkin sudah selesai atau bukan live).",
      );
    }

    this.mc = mc;
    this.status = {
      monitoring: true,
      videoId: mc.videoId,
      title: mc.title,
      hostChannelId: mc.channelId,
      messageCount: 0,
      startedAt: Date.now(),
    };

    mc.on("chat", (chat) => this.handleChat(chat));
    mc.on("actions", (actions) => this.handleActions(actions));
    mc.on("error", (err) => this.handlers.onError?.(err));
    mc.on("end", (reason) => {
      this.status.monitoring = false;
      this.handlers.onEnd?.(String(reason ?? "unknown"));
    });

    // Mulai loop (async, tidak di-await supaya start() langsung balik).
    mc.listen();

    return this.status;
  }

  private handleChat(chat: AddChatItemAction): void {
    const msg: ChatMessage = {
      authorChannelId: chat.authorChannelId,
      name: chat.authorName ?? "(tanpa nama)",
      text: stringify(chat.message ?? []) ?? "",
      timestamp:
        chat.timestamp instanceof Date ? chat.timestamp.getTime() : Date.now(),
      isOwner: chat.isOwner,
      isModerator: chat.isModerator,
      isMember: Boolean(chat.membership),
    };
    this.status.messageCount += 1;
    this.handlers.onMessage(msg);
  }

  /** Tangkap SuperChat & member baru dari batch actions. */
  private handleActions(actions: Action[]): void {
    for (const a of actions) {
      if (a.type === "addSuperChatItemAction") {
        this.handlers.onSuperChat?.({
          authorChannelId: a.authorChannelId,
          name: a.authorName ?? "(tanpa nama)",
          amount: `${a.currency ?? ""}${a.amount ?? ""}`.trim(),
          message: stringify(a.message ?? []) ?? "",
        });
      } else if (
        a.type === "addMembershipItemAction" ||
        a.type === "addMembershipMilestoneItemAction"
      ) {
        this.handlers.onMember?.({
          authorChannelId: a.authorChannelId,
          name: a.authorName ?? "(tanpa nama)",
          level: a.level ?? "",
        });
      }
    }
  }

  /** Hentikan pemantauan (aman dipanggil walau belum start). */
  stop(): void {
    if (this.mc) {
      try {
        this.mc.stop();
      } catch {
        /* abaikan */
      }
      this.mc.removeAllListeners();
      this.mc = null;
    }
    this.status = { ...this.status, monitoring: false };
  }

  getStatus(): MonitorStatus {
    return this.status;
  }
}
