import { GuildMember } from "discord.js";
import { Backpack_already_exists_error, Backpack_misconfigured_error, backpack_store } from "../backpack.schema";
import { isUnknownChannelError } from "../discord_errors";
import { create_backpack_channel } from "./channel_factory";
import { backpack_create_lock } from "../backpack_lock";

export type CreateBackpackResult = {
    status: "created" | "exists" | "misconfigured";
    message: string;
};

export async function create_backpack({ member }: { member: GuildMember }): Promise<CreateBackpackResult> {
    return backpack_create_lock.run(member.id, () => create_backpack_unlocked({ member }));
}

async function create_backpack_unlocked({ member }: { member: GuildMember }): Promise<CreateBackpackResult> {
    const have_channel = backpack_store.get_channel_by_user(member.id);

    if (have_channel) {
        const channel = await member.guild.channels.fetch(have_channel.id).catch((error) => {
            if (isUnknownChannelError(error)) return null;
            throw error;
        });

        if (channel) {
            return { status: "exists", message: `У вас уже есть канал <#${channel.id}>` };
        }

        await backpack_store.remove_channel(have_channel.id);
    }

    try {
        const channel = await create_backpack_channel(member);
        return { status: "created", message: `Канал создан: <#${channel.id}>` };
    } catch (error) {
        if (error instanceof Backpack_already_exists_error) {
            return { status: "exists", message: "У вас уже есть канал." };
        }
        if (error instanceof Backpack_misconfigured_error) {
            return { status: "misconfigured", message: "Система бэкпаков не настроена. Обратитесь к администратору." };
        }
        throw error;
    }
}