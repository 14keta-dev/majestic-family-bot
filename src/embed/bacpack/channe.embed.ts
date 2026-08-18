import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js";

export const BACKPACK_CHANNEL_EMBED_CUSTOM_IDS = {
    select: "embed:backpack",
    delete: "deleted",
    promote: "promote",
    demote: "demote",
};

export const backpack_channel_embed = ({ userId }: { userId: string }) => {
    const embed = new EmbedBuilder()
        .setTitle("—・ Личное дело")
        .setDescription(
            "Этот канал создан для вашего улучшения, и здесь вы будете получать ценные советы от более опытных игроков."
        )
        .setImage("https://i.imgur.com/XSGexkV.gif")
        .setTimestamp();

    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(BACKPACK_CHANNEL_EMBED_CUSTOM_IDS.select)
            .setPlaceholder("Управления каналом")
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel("Удалить")
                    .setValue(`${BACKPACK_CHANNEL_EMBED_CUSTOM_IDS.delete}:${userId}`)
            )
    );

    return { embed, select };
};