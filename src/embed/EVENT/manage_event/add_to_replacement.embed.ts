import { ActionRowBuilder, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, UserSelectMenuBuilder } from "discord.js";

import { botAssetsEmojis } from "../../../utils/emojis/emojis";
import { EventSchema } from "../../../utils/EVENT/event.schema";

export const ADD_TO_EVENT_REPLACEMENT_LIST_SELECT = "embed:manage_event:replacement_select";

export const add_to_event_replacement_list = ({ event }: { event: EventSchema }) => {
    const container =
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Добавить в запасной состав"),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${botAssetsEmojis.dot} Добавить участников`),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(`${ADD_TO_EVENT_REPLACEMENT_LIST_SELECT}:${event.id}`)
                            .setMaxValues(25)
                    ),
            );


    return [container]
}