import { MediaGalleryBuilder, MediaGalleryItemBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, SectionBuilder, ContainerBuilder } from 'discord.js';

export const CREATE_BACKPACK_EMBED_CUSTOM_IDS = {
    create: "embed:backpack:create"
}

export const create_backpack_embed = () => {
    return [
        new ContainerBuilder()
            .setAccentColor(0x282828)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL("https://i.imgur.com/XSGexkV.gif"),
                    ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## —・ Портфель"),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("Это ваш личный профиль или канал для фиксации откатов, активности и прогресса."),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Создать")
                            .setCustomId(CREATE_BACKPACK_EMBED_CUSTOM_IDS.create)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("・Создать портфель"),
                    ),
            ),
    ]
}