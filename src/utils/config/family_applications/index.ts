import { Majestic_Servers } from "../../emojis/server_emoji_map";

export interface FamilyApplicationsChannels {
    apply_channel: string;
    incoming_applications: string;
    interview_channel: string;
    accepted_archive: string;
    rejected_archive: string;
    status_log?: string;
}

export interface FamilyApplicationsConfig {
    active: boolean
    server: Majestic_Servers;
    channels: FamilyApplicationsChannels;
    apply_messageId: string | null;
    priority_roles: string[];
}