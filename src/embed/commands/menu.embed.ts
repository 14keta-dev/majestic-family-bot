import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";

export const MANAGE_MENU_CUSTOM_ID = {
    family_applications: "embed:manage-menu:manage-applications:button"
}

export const manage_menu_embed = [
    new ContainerBuilder()
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Управления Заявками")
                        .setCustomId(MANAGE_MENU_CUSTOM_ID.family_applications),
                ),
        ),
];