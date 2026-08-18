import { ChannelType, Guild } from "discord.js";
import { backpack_store } from "../backpack.schema";
import { getConfig } from "../../config/store";
import { isUnknownChannelError } from "../discord_errors";
import { build_role_overwrites } from "./permission_overwrites";
import { category_reservations } from "./category_reservations";
import { backpack_topology_lock } from "../backpack_lock";

const MAX_CHANNELS_PER_CATEGORY = 50;

type BackpackConfig = ReturnType<typeof getConfig>["backpack"];

async function create_category(guild: Guild, config: BackpackConfig): Promise<{ id: string }> {
    const categoryCount = backpack_store.get_all_categories().length;

    const newCategory = await guild.channels.create({
        name: `archive・${categoryCount}`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: build_role_overwrites(config.allowed_roles),
    });

    await backpack_store.register_category(newCategory.id);

    return { id: newCategory.id };
}

async function reap_missing_category(guild: Guild, categoryId: string, fallbackTargetId: string): Promise<void> {
    const category = await backpack_store.get_category(categoryId);

    await backpack_store.remove_category(categoryId);

    if (!category) return;

    for (const channelId of category.channels) {
        const discordChannel = await guild.channels.fetch(channelId).catch((error) => {
            if (isUnknownChannelError(error)) return null;
            throw error;
        });

        if (!discordChannel || discordChannel.isThread()) {
            await backpack_store.remove_channel(channelId);
            continue;
        }

        await discordChannel.setParent(fallbackTargetId, { lockPermissions: false });
        await backpack_store.move_channel_category(channelId, fallbackTargetId);
    }
}

async function resolve_category_unlocked(guild: Guild, config: BackpackConfig): Promise<string> {
    const categories = backpack_store.get_all_categories();
    const live: { id: string; count: number }[] = [];
    const missing: string[] = [];

    for (const category of categories) {
        const discordCategory = await guild.channels.fetch(category.id).catch((error) => {
            if (isUnknownChannelError(error)) return null;
            throw error;
        });

        if (!discordCategory || discordCategory.type !== ChannelType.GuildCategory) {
            missing.push(category.id);
            continue;
        }

        const cacheCount = guild.channels.cache.filter((c) => c.parentId === category.id).size;
        live.push({ id: category.id, count: cacheCount + category_reservations.get(category.id) });
    }

    const roomy = live.find((c) => c.count < MAX_CHANNELS_PER_CATEGORY);
    const target = roomy ?? { id: (await create_category(guild, config)).id, count: 0 };
    category_reservations.reserve(target.id);

    for (const categoryId of missing) {
        await reap_missing_category(guild, categoryId, target.id);
    }

    return target.id;
}

export async function resolve_category(guild: Guild, config: BackpackConfig): Promise<string> {
    return backpack_topology_lock.run(guild.id, () => resolve_category_unlocked(guild, config));
}