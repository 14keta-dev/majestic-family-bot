import { AFK_Config } from "./AFK";
import { BotLogs } from "./logs/bot_logs";
import { FamilyApplicationsConfig } from "./family_applications";
import { Vacation_config } from "./vacation";

export interface BotConfig {
    family_applications: FamilyApplicationsConfig;
    AFK: AFK_Config;
    logs: BotLogs;
    vacation: Vacation_config;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };