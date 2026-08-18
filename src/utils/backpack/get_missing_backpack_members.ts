import { Guild, GuildMember } from "discord.js";
import { BotConfig } from "../config/types";
import { backpack_store } from "./backpack.schema";

async function getFamilyMembers(guild: Guild, familyRoleId: string): Promise<GuildMember[]> {
    // prefer cache — avoids hitting the gateway's REQUEST_GUILD_MEMBERS rate limit (opcode 8)
    let members = guild.members.cache;

    if (members.size < guild.memberCount) {
        try {
            members = await guild.members.fetch();
        } catch {
            // rate limited or otherwise failed — fall back to whatever's cached rather than throwing
        }
    }

    return [...members.filter((member) => member.roles.cache.has(familyRoleId)).values()];
}

export interface BackpackFamilyStatus {
    familyMembers: GuildMember[];
    missingMembers: GuildMember[];
}

export async function get_backpack_family_status(guild: Guild, config: BotConfig): Promise<BackpackFamilyStatus> {
    if (!config.family_role) return { familyMembers: [], missingMembers: [] };

    const backpackUserIds = new Set(backpack_store.get_all_channels().map((b) => b.userId));
    const familyMembers = await getFamilyMembers(guild, config.family_role);
    const missingMembers = familyMembers.filter((member) => !backpackUserIds.has(member.id));

    return { familyMembers, missingMembers };
}

export async function get_family_members_without_backpack(guild: Guild, config: BotConfig): Promise<GuildMember[]> {
    return (await get_backpack_family_status(guild, config)).missingMembers;
}