import { ActionRowBuilder, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { metaBuilder } from "../logger/met_builder";
import { log } from "../logger";

export const TAKE_VACATION_MODAL_CUSTOM_ID = {
    modal: "embed:vacation:take_vacation:modal",
    duration: "embed:vacation:take_vacation:duration:input",
    reason: "embed:vacation:take_vacation:reason:input",
} as const;

function buildDurationInput(): TextInputBuilder {
    return new TextInputBuilder()
        .setCustomId(TAKE_VACATION_MODAL_CUSTOM_ID.duration)
        .setLabel("До какой даты? (дд.мм)")
        .setPlaceholder("25.02 | дд.мм")
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);
}

function buildReasonInput(): TextInputBuilder {
    return new TextInputBuilder()
        .setCustomId(TAKE_VACATION_MODAL_CUSTOM_ID.reason)
        .setLabel("Причина?")
        .setPlaceholder("Школа")
        .setRequired(true)
        .setMinLength(4)
        .setStyle(TextInputStyle.Paragraph);
}

export default function take_vacation(member: GuildMember): ModalBuilder {
    if (!member) {
        throw new Error("No guild member provided");
    }

    log.command.info(metaBuilder(member, { helper: "take_vacation.helper" }), "Building take vacation modal");

    return new ModalBuilder()
        .setCustomId(TAKE_VACATION_MODAL_CUSTOM_ID.modal)
        .setTitle("Взять отпуск")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(buildDurationInput()),
            new ActionRowBuilder<TextInputBuilder>().addComponents(buildReasonInput()),
        );
}