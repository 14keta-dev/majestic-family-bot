import { ActionRowBuilder, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, UserSelectMenuBuilder } from "discord.js";
import { botAssetsEmojis } from "../../../utils/emojis/emojis";
import { EventSchema } from "../../../utils/EVENT/event.schema";

export const ADD_TO_EVENT_MAIN_LIST_SELECT = "embed:manage_event:select";

export const add_to_event_main_list = ({ event }: { event: EventSchema }) => {
    const remainingSlots = event.maxParticipants - (event.mainListParticipant?.length ?? 0);
    const maxValues = Math.max(1, Math.min(remainingSlots, 25));

    const container =
        new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Добавить в основной состав"))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${botAssetsEmojis.dot} Добавить участников (свободно мест: ${remainingSlots})`))
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId(`${ADD_TO_EVENT_MAIN_LIST_SELECT}:${event.id}`)
                        .setMaxValues(maxValues)
                ),
            );

    return [container];
};