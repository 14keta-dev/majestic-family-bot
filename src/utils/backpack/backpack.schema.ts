import { JsonDb } from "../db/local/local_db";

export interface Backpack_category_interface {
    // discord snowflake of the category channel
    id: string;
    // channel ids stored inside this category
    channels: string[];
}

export interface Backpack_channel {
    // discord snowflake of channel
    id: string;
    // who can view the channel
    userId: string;
    // category where the channel lives
    categoryId: string;
    // message sent inside the channel
    messageId: string;
    createdAt: string;
    updatedAt: string;
}

export class Backpack_already_exists_error extends Error {
    constructor(public readonly userId: string, public readonly existingId: string) {
        super(`User ${userId} already has a backpack channel (${existingId})`);
        this.name = "Backpack_already_exists_error";
    }
}

export class Backpack_category_not_found_error extends Error {
    constructor(public readonly categoryId: string) {
        super(`Backpack category ${categoryId} was not found`);
        this.name = "Backpack_category_not_found_error";
    }
}

export class Backpack_misconfigured_error extends Error {
    constructor() {
        super("backpack.allowed_roles is empty — refusing to create a channel nobody can see");
        this.name = "Backpack_misconfigured_error";
    }
}

const categoryDB = new JsonDb<Backpack_category_interface>("backpack_category");
const channelDB = new JsonDb<Backpack_channel>("backpack_channels");

export const backpack_store = {
    get_category: (id: string) => categoryDB.get(id),
    get_all_categories: () => categoryDB.getAll(),
    get_channel: (id: string) => channelDB.get(id),
    get_all_channels: () => channelDB.getAll(),
    get_channel_by_user: (userId: string) => channelDB.find((c) => c.userId === userId),

    async register_category(id: string): Promise<Backpack_category_interface> {
        const category: Backpack_category_interface = { id, channels: [] };
        await categoryDB.set(category);
        return category;
    },

    async register_channel(data: {
        id: string;
        userId: string;
        categoryId: string;
        messageId?: string;
    }): Promise<Backpack_channel> {
        const existing = channelDB.find((c) => c.userId === data.userId);

        if (existing) {
            throw new Backpack_already_exists_error(data.userId, existing.id);
        }

        const now = new Date().toISOString();

        const channel: Backpack_channel = {
            id: data.id,
            userId: data.userId,
            categoryId: data.categoryId,
            messageId: data.messageId ?? "",
            createdAt: now,
            updatedAt: now,
        };

        await channelDB.set(channel);
        return channel;
    },

    async add_channel_to_category(categoryId: string, channelId: string): Promise<void> {
        const category = await categoryDB.get(categoryId);

        if (!category) {
            throw new Backpack_category_not_found_error(categoryId);
        }

        if (category.channels.includes(channelId)) return;

        category.channels.push(channelId);
        await categoryDB.set(category);
    },

    async remove_channel_from_category(categoryId: string, channelId: string): Promise<void> {
        const category = await categoryDB.get(categoryId);

        if (!category) return;

        const nextChannels = category.channels.filter((id) => id !== channelId);

        if (nextChannels.length === category.channels.length) return;

        category.channels = nextChannels;
        await categoryDB.set(category);
    },

    async remove_channel(id: string): Promise<void> {
        const channel = await channelDB.get(id);

        await channelDB.delete(id);

        if (channel) {
            await this.remove_channel_from_category(channel.categoryId, id);
        }
    },

    async remove_category(id: string): Promise<void> {
        await categoryDB.delete(id);
    },

    async move_channel_category(channelId: string, newCategoryId: string): Promise<Backpack_channel | null> {
        const channel = await channelDB.get(channelId);

        if (!channel) return null;

        const previousCategoryId = channel.categoryId;

        if (previousCategoryId === newCategoryId) return channel;

        await this.add_channel_to_category(newCategoryId, channelId);
        await this.remove_channel_from_category(previousCategoryId, channelId);

        return channelDB.update(channelId, {
            categoryId: newCategoryId,
            updatedAt: new Date().toISOString(),
        });
    },
} as const;