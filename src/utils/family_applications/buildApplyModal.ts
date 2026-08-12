import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { ApplyType, ApplyTypeField, MAX_MODAL_FIELDS } from "../config/family_applications/apply_config";

export const APPLY_MODAL_PREFIX = "apply_modal";

export function buildApplyModalCustomId(applyTypeId: string): string {
    return `${APPLY_MODAL_PREFIX}:${applyTypeId}`;
}

export function parseApplyModalCustomId(customId: string): string | undefined {
    if (!customId.startsWith(`${APPLY_MODAL_PREFIX}:`)) return undefined;
    return customId.slice(APPLY_MODAL_PREFIX.length + 1);
}

export class MissingFieldPresetError extends Error {
    constructor(applyTypeId: string, fieldId: string) {
        super(`Apply type "${applyTypeId}" references field "${fieldId}", which is not registered in APPLY_FIELDS.`);
        this.name = "MissingFieldPresetError";
    }
}

function buildTextInput(field: ApplyTypeField): TextInputBuilder {
    const input = new TextInputBuilder()
        .setCustomId(field.id)
        .setLabel(field.label)
        .setStyle(field.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(field.required ?? false);

    if (field.placeholder) input.setPlaceholder(field.placeholder);
    if (field.minLength != null) input.setMinLength(field.minLength);
    if (field.maxLength != null) input.setMaxLength(field.maxLength);

    return input;
}

export function buildApplyModal(applyType: ApplyType, applyFields: Record<string, ApplyTypeField>): ModalBuilder {
    if (applyType.fields.length > MAX_MODAL_FIELDS) {
        throw new Error(
            `Apply type "${applyType.id}" has ${applyType.fields.length} fields, exceeding the modal limit of ${MAX_MODAL_FIELDS}.`,
        );
    }

    const rows = applyType.fields.map((fieldId) => {
        const preset = applyFields[fieldId];
        if (!preset) throw new MissingFieldPresetError(applyType.id, fieldId);
        return new ActionRowBuilder<TextInputBuilder>().addComponents(buildTextInput(preset));
    });

    return new ModalBuilder()
        .setCustomId(buildApplyModalCustomId(applyType.id))
        .setTitle(applyType.name.slice(0, 45))
        .addComponents(...rows);
}