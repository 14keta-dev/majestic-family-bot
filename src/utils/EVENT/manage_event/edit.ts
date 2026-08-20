import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { formatDateTimeForInput } from "../format_date";
import { EventSchema } from "../event.schema";


export const EDIT_EVENT_MODAL_CUSTOM_IDS = {
    modal: "embed:edit:event:create:modal",
    description: "embed:edit:event:description:input",
    participants: "embed:edit:event:participants:input",
    start_time: "embed:edit:event:start_time:input"
}


export const edit_event_modal = ({ id, event }: { id: string, event: EventSchema }) => {
    const description_input = new TextInputBuilder()
        .setLabel("Описания")
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(4000)
        .setValue(event.description)
        .setCustomId(`${EDIT_EVENT_MODAL_CUSTOM_IDS.description}:${id}`)
        .setStyle(TextInputStyle.Paragraph);

    const max_participants = new TextInputBuilder()
        .setLabel("Огран участников")
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3)
        .setValue(String(event.maxParticipants))
        .setStyle(TextInputStyle.Short)
        .setCustomId(`${EDIT_EVENT_MODAL_CUSTOM_IDS.participants}:${id}`)

    const start_time = new TextInputBuilder()
        .setLabel("Начало")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setValue(formatDateTimeForInput(event.startTime))
        .setCustomId(`${EDIT_EVENT_MODAL_CUSTOM_IDS.start_time}:${id}`)

    const modal = new ModalBuilder()
        .setTitle(`Редактировать ${event.type}`)
        .setCustomId(`${EDIT_EVENT_MODAL_CUSTOM_IDS.modal}:${id}`)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(description_input),
            new ActionRowBuilder<TextInputBuilder>().addComponents(max_participants),
            new ActionRowBuilder<TextInputBuilder>().addComponents(start_time),
        );

    return modal;
}