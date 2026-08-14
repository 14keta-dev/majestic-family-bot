import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";
import { AFK_config_draft } from "../../utils/AFK/draft_afk_store";

export const SETUP_AFK_CUSTOM_ID = {
    panel_channel: "setup:afk:panel_channel",
    log_channel: "setup:afk:log_channel",
    confirm: "setup:afk:confirm",
} as const;

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

export function build_set_up_afk_embed(draft: AFK_config_draft = {}) {
    return [
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Канал панели AFK"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(SETUP_AFK_CUSTOM_ID.panel_channel, [ChannelType.GuildText], draft.panel_channel),
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("> Канал логов AFK (необязательно)"),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    channelSelect(
                        SETUP_AFK_CUSTOM_ID.log_channel,
                        [ChannelType.GuildText],
                        draft.afk_log,
                        0,
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
                            .setCustomId(SETUP_AFK_CUSTOM_ID.confirm),
                    ),
            ),
    ];
}