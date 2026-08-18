import { GuildMember } from "discord.js";
import { getConfig } from "../config/store";

export async function can_manage_backpack({ member }: { member: GuildMember }): Promise<boolean> {
    if (!member) return false;

    try {
        const config = getConfig().backpack;

        if (member.permissions.has("Administrator")) return true;

        return config.allowed_roles.some((roleId) => member.roles.cache.has(roleId));
    } catch (error) {
        console.error("can_manage_backpack failed, denying by default:", error);
        return false;
    }
}