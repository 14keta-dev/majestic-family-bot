import { ChannelType, GuildMember } from "discord.js";
import { Backpack_misconfigured_error, backpack_store } from "../backpack.schema";
import { backpack_channel_embed } from "../../../embed/bacpack/channe.embed";
import { getConfig } from "../../config/store";
import { resolve_category } from "./category_resolver";
import { build_everyone_deny_overwrite, build_member_overwrite, build_role_overwrites } from "./permission_overwrites";
import { category_reservations } from "./category_reservations";

export async function create_backpack_channel(member: GuildMember): Promise<{ id: string }> {
    const config = getConfig().backpack;

    if (!config.allowed_roles?.length) {
        throw new Backpack_misconfigured_error();
    }

    const categoryId = await resolve_category(member.guild, config);

    try {
        const channel = await member.guild.channels.create({
            name: `backpack・${member.displayName}`,
            type: ChannelType.GuildText,
            parent: categoryId,
            permissionOverwrites: [
                build_everyone_deny_overwrite(member.guild.id),
                build_member_overwrite(member.id),
                ...build_role_overwrites(config.allowed_roles),
            ],
        });

        try {
            const { embed, select } = backpack_channel_embed({ userId: member.id });

            const channel_message = await channel.send({
                content: `<@${member.id}>`,
                embeds: [embed],
                components: [select],
            });

            await backpack_store.register_channel({
                id: channel.id,
                userId: member.id,
                categoryId,
                messageId: channel_message.id,
            });

            await backpack_store.add_channel_to_category(categoryId, channel.id);
        } catch (error) {
            await channel.delete().catch(() => {
                // best-effort cleanup; nothing more we can do if this also fails
            });
            throw error;
        }

        return { id: channel.id };
    } finally {
        category_reservations.release(categoryId);
    }
}