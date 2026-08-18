import { DiscordAPIError } from "discord.js";

export const UNKNOWN_CHANNEL_ERROR_CODE = 10_003;

export function isUnknownChannelError(error: unknown): boolean {
    return error instanceof DiscordAPIError && error.code === UNKNOWN_CHANNEL_ERROR_CODE;
}