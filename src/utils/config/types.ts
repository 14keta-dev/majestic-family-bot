import { FamilyApplicationsConfig } from "./family_applications";

export interface BotConfig {
    family_applications: FamilyApplicationsConfig;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };