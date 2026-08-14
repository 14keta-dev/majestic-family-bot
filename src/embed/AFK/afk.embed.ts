import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { botAssetEmojis } from "../../utils/emojis/emojis";

export const AFK_EMBED_BUTTON_CUSTOM_IDS = {
    enter: "embed:afk:enter",
    list: "embed:afk:list",
    leave: "embed:afk:leave"
}

export const afk_embed = () => {
    const embed = new EmbedBuilder()
        .setTitle(`${botAssetEmojis.afk} AFK панель`)
        .setDescription(`> **Уход в AFK до 24 часов.**\n\n` +
            `> **Кнопки:**\n` +
            `**• Уйти в AFK** — откроется модалка для ввода времени и причины\n` +
            `**• Список AFK** — покажет текущий список\n` +
            `**• Выйти из AFK** — завершить AFK досрочно`
        );


    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel("Уйти в AFK")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(AFK_EMBED_BUTTON_CUSTOM_IDS.enter),
        new ButtonBuilder()
            .setLabel("Список")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(AFK_EMBED_BUTTON_CUSTOM_IDS.list),
        new ButtonBuilder()
            .setLabel("Выйти из AFK")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(AFK_EMBED_BUTTON_CUSTOM_IDS.leave)
    );

    return { embed, row }
}