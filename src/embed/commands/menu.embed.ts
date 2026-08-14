import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";

export const MANAGE_MENU_CUSTOM_ID = {
    family_applications: "embed:manage-menu:manage-applications:button",
    afk: "embed:manage-menu:manage-afk:button",
    vacation: "embed:manage-menu:manage-vacation:button"
}

export const manage_menu_embed = [
    new ContainerBuilder()
        .setAccentColor(10070709)
        .addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Управления Заявками")
                        .setCustomId(MANAGE_MENU_CUSTOM_ID.family_applications),
                    new ButtonBuilder()
                        .setLabel("Управления AFK")
                        .setCustomId(MANAGE_MENU_CUSTOM_ID.afk)
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel("Управления Отпуском")
                        .setCustomId(MANAGE_MENU_CUSTOM_ID.vacation)
                        .setStyle(ButtonStyle.Secondary)
                ),
        ),
];