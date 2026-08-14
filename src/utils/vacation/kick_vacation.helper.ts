import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const VACATION_KICK_MODAL_CUSTOM_ID = {
    modal: "embed:vacation:vacation_request:kick_modal:",
    reason: "embed:vacation:vacation_request:kick_modal:reason:input",
} as const;


export function build_kick_vacation_modal(entryId: string): ModalBuilder {
    const reasonInput = new TextInputBuilder()
        .setCustomId(VACATION_KICK_MODAL_CUSTOM_ID.reason)
        .setLabel("Причина завершения отпуска?")
        .setPlaceholder("Например: понадобился раньше срока")
        .setRequired(true)
        .setMinLength(4)
        .setStyle(TextInputStyle.Paragraph);

    return new ModalBuilder()
        .setCustomId(VACATION_KICK_MODAL_CUSTOM_ID.modal + `:${entryId}`)
        .setTitle("Завершить отпуск")
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
}