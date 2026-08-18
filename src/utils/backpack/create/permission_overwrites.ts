import { OverwriteType, PermissionFlagsBits } from "discord.js";

export function build_role_overwrites(roleIds: readonly string[]) {
    return roleIds.map((id) => ({
        id,
        type: OverwriteType.Role,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    }));
}

export function build_member_overwrite(memberId: string) {
    return {
        id: memberId,
        type: OverwriteType.Member,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    };
}

// @everyone role's id is always the same as the guild id
export function build_everyone_deny_overwrite(guildId: string) {
    return {
        id: guildId,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    };
}