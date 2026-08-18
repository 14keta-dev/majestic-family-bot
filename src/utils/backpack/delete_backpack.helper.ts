import { Client, Guild, GuildChannel } from "discord.js";
import { backpack_store } from "./backpack.schema";
import { env } from "../env";
import { isUnknownChannelError } from "./discord_errors";
import { backpack_topology_lock } from "./backpack_lock";

async function deleteDiscordChannelIfPresent(guild: Guild, channelId: string): Promise<void> {
    try {
        await guild.channels.delete(channelId);
    } catch (error) {
        if (isUnknownChannelError(error)) return; 
        throw error;
    }
}

export async function delete_backpack({ channel, client }: { channel: GuildChannel; client: Client }): Promise<void> {
    if (!channel) {
        throw new Error("No channel provided");
    }

    const guild = await client.guilds.fetch(env.GUILD_ID);

    await backpack_topology_lock.run(guild.id, async () => {
        const db_channel = await backpack_store.get_channel(channel.id);
        if (!db_channel) return;

        try {
            await deleteDiscordChannelIfPresent(guild, db_channel.id);
        } catch (error) {
            console.error(`Failed to delete backpack channel ${db_channel.id} on Discord:`, error);
        }

        await backpack_store.remove_channel(db_channel.id);

        const channel_category = await backpack_store.get_category(db_channel.categoryId);
        if (!channel_category) return;

        const remainingChannels = channel_category.channels.filter((id) => id !== db_channel.id);

        if (remainingChannels.length === 0) {
            try {
                await deleteDiscordChannelIfPresent(guild, channel_category.id);
            } catch (error) {
                console.error(`Failed to delete backpack category ${channel_category.id} on Discord:`, error);
            }
            await backpack_store.remove_category(channel_category.id);
        } else {
            await backpack_store.remove_channel_from_category(channel_category.id, db_channel.id);
        }
    });
}