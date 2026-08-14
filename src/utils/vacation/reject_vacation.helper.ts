import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const VACATION_REJECT_MODAL_CUSTOM_ID = {
    modal: "embed:vacation:vacation_request:reject_modal:",
    reason: "embed:vacation:vacation_request:reject_modal:reason:input",
} as const;

function buildRejectReasonInput(): TextInputBuilder {
    return new TextInputBuilder()
        .setCustomId(VACATION_REJECT_MODAL_CUSTOM_ID.reason)
        .setLabel("Причина отклонения")
        .setPlaceholder("Укажите, почему запрос отклонён")
        .setRequired(true)
        .setMinLength(4)
        .setStyle(TextInputStyle.Paragraph);
}

export function build_reject_vacation_modal(entryId: string): ModalBuilder {
    return new ModalBuilder()
        .setCustomId(VACATION_REJECT_MODAL_CUSTOM_ID.modal + `:${entryId}`)
        .setTitle("Отклонить отпуск")
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(buildRejectReasonInput()));
}