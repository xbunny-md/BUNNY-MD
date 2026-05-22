const { createClient } = require("@supabase/supabase-js");

class StateManager {
  constructor() {
    this.clientId = process.env.CLIENT_ID || "BUNNY_DEFAULT";
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Default values - updated
    this.prefix = ".";
    this.botName = "Bunny MD";
    this.ownerName = "Lupin Starnley";
    this.ownerNumber = "255780470905";

    // Flags
    this.isConnected = false;
    this.onboardingSent = false;

    // Channel for realtime
    this.channel = null;
  }

  async loadSettings() {
    try {
      const { data } = await this.supabase
      .from("bunny_settings")
      .select("setting_name, extra_data")
      .eq("client_id", this.clientId);

      if (data) {
        for (const item of data) {
          if (item.setting_name === "prefix") this.prefix = item.extra_data.current || ".";
          if (item.setting_name === "bot_name") this.botName = item.extra_data.current || "Bunny MD";
          if (item.setting_name === "owner_name") this.ownerName = item.extra_data.current || "Lupin Starnley";
          if (item.setting_name === "owner_number") this.ownerNumber = item.extra_data.current || "255780470905";
        }
      }

      this.listenRealtime();
      console.log(`[State] Loaded settings for ${this.clientId}`);
    } catch (err) {
      console.error("[State] Load error:", err.message);
    }
  }

  listenRealtime() {
    if (this.channel) this.channel.unsubscribe();

    this.channel = this.supabase
    .channel(`settings-${this.clientId}`)
    .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "bunny_settings",
        filter: `client_id=eq.${this.clientId}`
      }, (payload) => {
        const name = payload.new.setting_name;
        const value = payload.new.extra_data?.current;

        if (name === "prefix") this.prefix = value;
        if (name === "bot_name") this.botName = value;
        if (name === "owner_name") this.ownerName = value;
        if (name === "owner_number") this.ownerNumber = value;

        console.log(`[State] Updated ${name} = ${value}`);
      })
    .subscribe();
  }

  async updateSetting(name, value) {
    try {
      await this.supabase
      .from("bunny_settings")
      .update({ extra_data: { current: value } })
      .eq("client_id", this.clientId)
      .eq("setting_name", name);

      return true;
    } catch (err) {
      console.error("[State] Update error:", err.message);
      return false;
    }
  }

  isOwner(jid) {
    const num = jid.split("@")[0].replace(/[^0-9]/g, "");
    return num === this.ownerNumber;
  }
}

module.exports = StateManager;