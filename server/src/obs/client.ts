// Klien OBS WebSocket (obs-websocket v5). Best-effort: kalau OBS mati, gagal diam-diam.
import OBSWebSocket from "obs-websocket-js";
import type { SettingsRepo } from "../db/repo/settings.ts";

export interface ObsStatus {
  enabled: boolean;
  connected: boolean;
  error: string | null;
  currentScene: string | null;
  scenes: string[];
}

export class ObsClient {
  private obs = new OBSWebSocket();
  private connected = false;
  private error: string | null = null;
  private currentScene: string | null = null;
  private scenes: string[] = [];
  private sceneBeforeAlert: string | null = null;

  constructor(private readonly settings: SettingsRepo) {
    this.obs.on("ConnectionClosed", () => {
      this.connected = false;
    });
    this.obs.on("CurrentProgramSceneChanged", (d: { sceneName: string }) => {
      this.currentScene = d.sceneName;
    });
  }

  private cfgEnabled(): boolean {
    return this.settings.get<boolean>("obs.enabled", false);
  }

  /** Sambung ke OBS pakai setting terkini. Aman dipanggil berulang. */
  async connect(): Promise<ObsStatus> {
    if (this.connected) return this.status();
    const url = String(this.settings.get<string>("obs.url", "ws://127.0.0.1:4455")).trim();
    const password = String(this.settings.get<string>("obs.password", ""));
    try {
      await this.obs.connect(url, password || undefined);
      this.connected = true;
      this.error = null;
      await this.refreshScenes();
    } catch (e) {
      this.connected = false;
      this.error = e instanceof Error ? e.message : "gagal menyambung";
    }
    return this.status();
  }

  async disconnect(): Promise<void> {
    try {
      await this.obs.disconnect();
    } catch {
      /* abaikan */
    }
    this.connected = false;
  }

  private async refreshScenes(): Promise<void> {
    try {
      const r = (await this.obs.call("GetSceneList")) as unknown as {
        currentProgramSceneName: string;
        scenes: { sceneName: string }[];
      };
      this.currentScene = r.currentProgramSceneName;
      this.scenes = r.scenes.map((s) => s.sceneName).reverse();
    } catch {
      /* abaikan */
    }
  }

  async setScene(name: string): Promise<boolean> {
    if (!this.connected || !name) return false;
    try {
      await this.obs.call("SetCurrentProgramScene", { sceneName: name });
      this.currentScene = name;
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : "gagal ganti scene";
      return false;
    }
  }

  status(): ObsStatus {
    return {
      enabled: this.cfgEnabled(),
      connected: this.connected,
      error: this.error,
      currentScene: this.currentScene,
      scenes: this.scenes,
    };
  }

  // ---- Hook alert (ganti scene selama alert tampil) ----
  onAlertStart(): void {
    if (!this.cfgEnabled() || !this.connected) return;
    const target = String(this.settings.get<string>("obs.alertScene", "")).trim();
    if (!target || target === this.currentScene) return;
    if (this.sceneBeforeAlert == null) this.sceneBeforeAlert = this.currentScene;
    void this.setScene(target);
  }

  onAlertEnd(): void {
    if (!this.cfgEnabled() || !this.connected) return;
    const back = this.sceneBeforeAlert;
    this.sceneBeforeAlert = null;
    if (back) void this.setScene(back);
  }
}
