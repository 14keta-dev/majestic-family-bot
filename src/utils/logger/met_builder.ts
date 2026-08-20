import { GuildMember, User } from "discord.js";

export interface LogMeta {
    guildId: string;
    userId: string;
    username?: string;
}

export function metaBuilder(user: GuildMember, extra?: Record<string, unknown>): LogMeta;
export function metaBuilder(user: User, guildId: string, extra?: Record<string, unknown>): LogMeta;
export function metaBuilder(
    user: GuildMember | User,
    guildIdOrExtra?: string | Record<string, unknown>,
    maybeExtra?: Record<string, unknown>
): LogMeta {
    if (user instanceof GuildMember) {
        return {
            guildId: user.guild.id,
            userId: user.id,
            username: user.user.username,
            ...(guildIdOrExtra as Record<string, unknown> | undefined),
        };
    }

    return {
        guildId: guildIdOrExtra as string,
        userId: user.id,
        username: user.username,
        ...maybeExtra,
    };
}