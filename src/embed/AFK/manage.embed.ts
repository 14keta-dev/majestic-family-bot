import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageActionRowComponentBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";

const BASE_URL = "embed:manage:afk";

export const MANAGE_AFK_CUSTOM_IDS = {
    edit: `${BASE_URL}:edit`,
} as const;

interface ManageAfkProps {
    panel_channel?: string | null;
    afk_log?: string | null;
}

export const manage_afk_embed = ({ panel_channel, afk_log }: ManageAfkProps) => {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Управление AFK"),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Канал панели -** ${panel_channel ? `<#${panel_channel}>` : "не настроен"} \n**Канал логов -** ${afk_log ? `<#${afk_log}>` : "не настроен"}`,
            ),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Изменить Настройки")
                    .setCustomId(MANAGE_AFK_CUSTOM_IDS.edit),
            ),
        );

    return [container];
};