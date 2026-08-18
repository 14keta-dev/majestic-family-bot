import { ChannelType, Guild } from "discord.js";
import { build_everyone_deny_overwrite, build_member_overwrite, build_role_overwrites } from "./create/permission_overwrites";
import { backpack_store } from "./backpack.schema";
import { isUnknownChannelError } from "./discord_errors";

const CONCURRENCY = 5;

export interface RewritePermissionsResult {
    categoriesUpdated: number;
    channelsUpdated: number;
    skipped: string[];
}

async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const current = items[index++];
            await fn(current);
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function rewrite_backpack_permissions(
    guild: Guild,
    allowedRoles: readonly string[],
): Promise<RewritePermissionsResult> {
    const result: RewritePermissionsResult = { categoriesUpdated: 0, channelsUpdated: 0, skipped: [] };

    const categories = backpack_store.get_all_categories();

    await runWithConcurrency(categories, CONCURRENCY, async (category) => {
        const discordCategory = await guild.channels.fetch(category.id).catch((error) => {
            if (isUnknownChannelError(error)) return null;
            throw error;
        });

        if (!discordCategory || discordCategory.type !== ChannelType.GuildCategory) {
            result.skipped.push(category.id);
            return;
        }

        try {
            await discordCategory.permissionOverwrites.set(build_role_overwrites(allowedRoles));
            result.categoriesUpdated++;
        } catch {
            result.skipped.push(category.id);
        }
    });

    const channels = backpack_store.get_all_channels();

    await runWithConcurrency(channels, CONCURRENCY, async (backpackChannel) => {
        const discordChannel = await guild.channels.fetch(backpackChannel.id).catch((error) => {
            if (isUnknownChannelError(error)) return null;
            throw error;
        });

        if (!discordChannel || discordChannel.isThread() || !discordChannel.isTextBased()) {
            result.skipped.push(backpackChannel.id);
            return;
        }

        try {
            await discordChannel.permissionOverwrites.set([
                build_everyone_deny_overwrite(guild.id),
                build_member_overwrite(backpackChannel.userId),
                ...build_role_overwrites(allowedRoles),
            ]);
            result.channelsUpdated++;
        } catch {
            result.skipped.push(backpackChannel.id);
        }
    });

    return result;
}