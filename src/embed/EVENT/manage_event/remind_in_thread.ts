
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import { EventSchema } from "../../../utils/EVENT/event.schema";


export const REMIND_THREAD_BASE_URL = "embed:event:remind_thred"

export const REMIND_THRED_CUSTOM_IDS = {
    main_list: `main_list`,
    replacement_list: `replacement_list`,
    both: `both`
};

export const remind_thread_embed = ({ event }: { event: EventSchema }) => {
    const mainEmpty = event.mainListParticipant.length < 1;
    const replacementEmpty = event.replacementListParticinapnt.length < 1;

    const container =
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Напомнить в ветки"),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(mainEmpty)
                            .setLabel("Основной список")
                            .setCustomId(`${REMIND_THREAD_BASE_URL}:${REMIND_THRED_CUSTOM_IDS.main_list}:${event.id}`),
                        new ButtonBuilder()
                            .setDisabled(replacementEmpty)
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Запасной список")
                            .setCustomId(`${REMIND_THREAD_BASE_URL}:${REMIND_THRED_CUSTOM_IDS.replacement_list}:${event.id}`),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(mainEmpty && replacementEmpty)
                            .setLabel("Оба списка")
                            .setCustomId(`${REMIND_THREAD_BASE_URL}:${REMIND_THRED_CUSTOM_IDS.both}:${event.id}`),
                    ),
            );

    return [container]
}