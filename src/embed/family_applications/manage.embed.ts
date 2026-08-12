// manage.embed.ts
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { botAssetEmojis } from '../../utils/emojis/emojis';
import type { ManageSummaryRow } from '../../utils/family_applications/manage_summary_query';

interface ManageProps {
    applications: ManageSummaryRow[];
    active: boolean;
}

const BASE_URL = "embed:manage:family_applications"

export const MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS = {
    edit: `${BASE_URL}:edit`,
    cooldown: `${BASE_URL}:cooldown`,
    stats: `${BASE_URL}:stats`,
    toggle_status: `${BASE_URL}:toggle_status`,
} as const;

export const manage_family_applications_embed = ({ applications, active }: ManageProps) => {

    const accepted = applications.filter((a) => a.applicationStatus === "ACCEPTED");
    const rejected = applications.filter((a) => a.applicationStatus === "REJECTED");

    const container =
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Управления заявками "),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Статус -** ${active ? `${botAssetEmojis.active} Открыто` : `${botAssetEmojis.closed} Закрыто`} \n**Всего заявок -** ${applications.length} \n**Принятых -** ${accepted.length} \n**Отклонёных -** ${rejected.length} `,
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(active ? ButtonStyle.Danger : ButtonStyle.Success)
                            .setLabel(active ? "Закрыть" : "Открыть")
                            .setCustomId(MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.toggle_status),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Изменить Настройки")
                            .setCustomId(MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.edit),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("КД")
                            .setCustomId(MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.cooldown),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Статистика")
                            .setCustomId(MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.stats),
                    ),
            );

    return [container]
}