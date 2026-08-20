import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import { EventSchema } from "../../../utils/EVENT/event.schema";

export const ARCHIVED_EVENT_EMBED_BASE_URL = "embed:manage_event:archived";

export const ARCHIVED_EVENT_BUTTONS = {
    request_replay: "request_replay",
    who_submitted: "who_submitted",
};

const GRAY_ACCENT = 9807270;

function formatUserList(userIds: string[] | undefined): string {
    if (!userIds || userIds.length === 0) return "Пусто";

    return userIds
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join("\n");
}

export const archived_event_embed = ({ event }: { event: EventSchema }) => {

    const timestamp = Math.floor(new Date(event.startTime).getTime() / 1000);
    const container =
        new ContainerBuilder()
            .setAccentColor(GRAY_ACCENT)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${event.type}** — МП завершено`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Регистрация:** Закрыто\n` +
                    `**Время проведения:** <t:${timestamp}:R>\n\n` +
                    `> ${event.description}`
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Основной список (${event.mainListParticipant?.length ?? 0}/${event.maxParticipants}):**\n${formatUserList(event.mainListParticipant)}`
                ),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Список замены:**\n${formatUserList(event.replacementListParticinapnt)}`
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
                            .setLabel("Запросить откаты")
                            .setCustomId(`${ARCHIVED_EVENT_EMBED_BASE_URL}:${ARCHIVED_EVENT_BUTTONS.request_replay}:${event.id}`),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Кто залил откаты")
                            .setCustomId(`${ARCHIVED_EVENT_EMBED_BASE_URL}:${ARCHIVED_EVENT_BUTTONS.who_submitted}:${event.id}`),
                    ),
            );

    return [container];
};