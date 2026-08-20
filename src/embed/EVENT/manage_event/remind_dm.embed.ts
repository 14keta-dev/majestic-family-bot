
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import { EventSchema } from "../../../utils/EVENT/event.schema";


export const REMIND_DM_BASE_URL = "embed:event:remind_dm"

export const REMIND_DM_CUSTOM_IDS = {
    main_list: `main_list`,
    replacement_list: `replacement_list`,
    both: `both`
};

export const remind_dm_embed = ({ event, disabled = false, status }: { event: EventSchema, disabled?: boolean, status?: string }) => {
    const mainEmpty = event.mainListParticipant.length < 1;
    const replacementEmpty = event.replacementListParticinapnt.length < 1;

    const container =
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(status ? `## Напомнить в лс\n> ${status}` : "## Напомнить в лс"),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(disabled || mainEmpty)
                            .setLabel("Основной список")
                            .setCustomId(`${REMIND_DM_BASE_URL}:${REMIND_DM_CUSTOM_IDS.main_list}:${event.id}`),
                        new ButtonBuilder()
                            .setDisabled(disabled || replacementEmpty)
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Запасной список")
                            .setCustomId(`${REMIND_DM_BASE_URL}:${REMIND_DM_CUSTOM_IDS.replacement_list}:${event.id}`),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(disabled || (mainEmpty && replacementEmpty))
                            .setLabel("Оба списка")
                            .setCustomId(`${REMIND_DM_BASE_URL}:${REMIND_DM_CUSTOM_IDS.both}:${event.id}`),
                    ),
            );

    return [container]
}