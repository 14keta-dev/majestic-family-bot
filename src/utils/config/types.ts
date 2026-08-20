import { AFK_Config } from "./AFK";
import { BotLogs } from "./logs/bot_logs";
import { FamilyApplicationsConfig } from "./family_applications";
import { Vacation_config } from "./vacation";
import { Temp_voice_iterface } from "./temp_voice";
import { backpack_interface } from "./backpack";
import { EventConfig } from "./EVENT";

export interface BotConfig {
    family_role: string;
    family_applications: FamilyApplicationsConfig;
    AFK: AFK_Config;
    logs: BotLogs;
    vacation: Vacation_config;
    temp_voice: Temp_voice_iterface;
    backpack: backpack_interface;
    event: EventConfig[];
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };