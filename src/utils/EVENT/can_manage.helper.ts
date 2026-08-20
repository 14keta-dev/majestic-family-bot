import { GuildMember, PermissionsBitField } from "discord.js";
import { getConfig } from "../config/store";
import { EventSchema } from "./event.schema";

export async function can_manage_event({ type, user, event }: { type: string, user: GuildMember, event: EventSchema }): Promise<boolean> {
    const config = getConfig().event;

    const mp_config = config.find((m) => m.name === type);
    if (!mp_config) return false;

    if (user.id === event.createdBy) return true;

    if (user.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

    const allowedRoles = mp_config.allowed_roles ?? [];
    if (allowedRoles.length > 0 && user.roles.cache.some((role) => allowedRoles.includes(role.id))) {
        return true;
    }

    return false;
}