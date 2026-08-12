import { FamilyApplicationsChannels, FamilyApplicationsConfig } from "../config/family_applications";

const REQUIRED_CHANNELS: Record<Exclude<keyof FamilyApplicationsChannels, "status_log">, true> = {
    apply_channel: true,
    incoming_applications: true,
    interview_channel: true,
    accepted_archive: true,
    rejected_archive: true,
};

const REQUIRED_CHANNEL_KEYS = Object.keys(REQUIRED_CHANNELS) as (keyof typeof REQUIRED_CHANNELS)[];

function isChannelSet(id: string | undefined): boolean {
    return id != null && id.trim().length > 0;
}

export function are_family_application_channels_configured(fc: FamilyApplicationsConfig): boolean {
    return REQUIRED_CHANNEL_KEYS.every((key) => isChannelSet(fc.channels[key]));
}