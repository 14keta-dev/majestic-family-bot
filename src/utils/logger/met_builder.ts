import { GuildMember } from "discord.js";

export interface LogMeta {
    guildId: string;
    userId: string;
    username?: string;
}

export const metaBuilder = (user: GuildMember, extra?: Record<string, unknown>): LogMeta => {
    return {
        guildId: user.guild.id,
        userId: user.id,
        username: user.user.username,
        ...extra,
    };
};