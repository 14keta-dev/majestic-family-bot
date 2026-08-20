import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

export interface MP_tag_props {
    id: string;
    name: string,
    registrationOpen: boolean;
    description: string;
    mainList?: string[];
    replacementList: string[];
    startTime: string;
    maxParticipants: number,
};

export const MANAGE_TAG_EMBED_CUSTOM_IDS = {
    manage: "embed:tag_embed"
}

function formatUserList(userIds: string[] | undefined): string {
    if (!userIds || userIds.length === 0) return "Пусто";

    return userIds
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join("\n");
}

export const event_tag_embed = ({ id, name, registrationOpen, description, mainList, replacementList, startTime, maxParticipants }: MP_tag_props) => {
    const reg_text = registrationOpen ? `${botAssetsEmojis.active} Открыто` : `${botAssetsEmojis.closed} Закрыто`;

    const container =
        new ContainerBuilder()
            .setAccentColor(registrationOpen ? 5763719 : 15277667)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`||@everyone|| | **${name}** `),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Регистрация:** ${reg_text}\n` +
                    `**Время проведения:** <t:${startTime}:R>\n\n` +
                    `> ${description}\n\n` +
                    `Оставьте сообщение в ветке ниже. Администратор отметит его реакцией \`✅\`, и вас переместит в основной список.`
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Основной список (${mainList?.length ?? 0}/${maxParticipants}):**\n${formatUserList(mainList)}`
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Список замены:**\n${formatUserList(replacementList)}`
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
                            .setLabel("Управлять списком")
                            .setCustomId(`${MANAGE_TAG_EMBED_CUSTOM_IDS.manage}:${id}`),
                    ),
            );

    return [container];
}