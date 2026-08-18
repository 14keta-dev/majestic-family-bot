import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ContainerBuilder, MessageActionRowComponentBuilder, RoleSelectMenuBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import { Backpack_config_draft } from "../../utils/backpack/draft";

export const SETUP_BACKPACK_CUSTOM_ID = {
    panel_channel: "setup:backpack:panel_channel",
    allowed_roles: "setup:backapack:allowed_roles",
    confirm: "setup:backapack:confirm"
}

function channelSelect(
    customId: string,
    channelTypes: ChannelType[],
    defaultChannelId?: string,
    minValues: 0 | 1 = 1,
): ChannelSelectMenuBuilder {
    const select = new ChannelSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(minValues === 0 ? "Выберите канал (необязательно)" : "Выберите канал")
        .addChannelTypes(...channelTypes)
        .setMinValues(minValues)
        .setMaxValues(1);

    if (defaultChannelId) {
        select.addDefaultChannels(defaultChannelId);
    }

    return select;
}

function roleSelect(
    customId: string,
    defaultRoleIds: string[] = [],
    maxValues = 1,
): RoleSelectMenuBuilder {
    const select = new RoleSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(maxValues > 1 ? "Выберите роли" : "Выберите роль")
        .setMinValues(1)
        .setMaxValues(maxValues);

    if (defaultRoleIds.length > 0) {
        select.addDefaultRoles(defaultRoleIds);
    }

    return select;
}
export const build_set_up_backpack_embed = (draft: Backpack_config_draft = {}) => {
    return [
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Канал панели создания"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(SETUP_BACKPACK_CUSTOM_ID.panel_channel, [ChannelType.GuildText], draft.panel_channel),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Роли модерации"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    roleSelect(
                        SETUP_BACKPACK_CUSTOM_ID.allowed_roles,
                        draft.allowed_roles ?? [],
                        25,
                    ),
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel(draft.isEdit ? "Сохранить" : "Подтвердить")
                            .setCustomId(SETUP_BACKPACK_CUSTOM_ID.confirm),
                    ),
            ),
    ]
}