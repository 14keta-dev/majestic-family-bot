import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import { EventSchema } from "../../../utils/EVENT/event.schema";


export const END_EVENT_EMBED_BASE_URL = "embed:manage_event:end"

export const END_EVENT_EMBED_BUTTONS = {
    end: `end`,
    cancel: `cancel`
}
export const end_event_embed = ({ event, archive_channel }: { event: EventSchema, archive_channel: string }) => {
    const container =
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Завершить МП"),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`При завершении МП сообщения архивируются в канале <#${archive_channel}>.`),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Завершить")
                            .setCustomId(`${END_EVENT_EMBED_BASE_URL}:${END_EVENT_EMBED_BUTTONS.end}:${event.id}`),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Отменить")
                            .setCustomId(`${END_EVENT_EMBED_BASE_URL}:${END_EVENT_EMBED_BUTTONS.cancel}:${event.id}`),
                    ),
            );


    return [container]
}