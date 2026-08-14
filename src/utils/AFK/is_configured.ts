import { AFK_Config } from "../config/AFK";
import { BotLogs } from "../config/logs/bot_logs";

function isChannelSet(id: string | undefined): boolean {
    return id != null && id.trim().length > 0;
}

export function are_afk_channels_configured(afk: AFK_Config, logs: BotLogs): boolean {
    return isChannelSet(afk.panel_channel) && isChannelSet(logs.afk_log);
}