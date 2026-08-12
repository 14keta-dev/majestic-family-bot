import {
    ContainerBuilder,
    GuildMember,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from "discord.js";
import { ApplyType } from "../../../utils/config/family_applications/apply_config";
import { APPLY_FIELDS } from "../../../utils/config/family_applications/applyFieldPresets";
import { escapeForCodeBlock, truncateField } from "../../../utils/family_applications/sanitizeText.helper";

interface RejectedArchiveProps {
    applicationId: string;
    applicant: GuildMember;
    fields: Record<string, string>;
    reviewer: GuildMember;
    apply_type: ApplyType;
    submittedAt: string;
    rejectedAt: string;
    reason: string;
    cooldownUntil: string | null;
    cooldownRemovedBy?: GuildMember;
    cooldownRemovedAt?: string;
}

function divider(): SeparatorBuilder {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);
}


export const rejected_archive_family_applications_embed = ({
    applicationId,
    applicant,
    fields,
    reviewer,
    apply_type,
    submittedAt,
    rejectedAt,
    reason,
    cooldownUntil,
    cooldownRemovedBy,
    cooldownRemovedAt,
}: RejectedArchiveProps) => {
    const avatarUrl = applicant.displayAvatarURL({ size: 128, extension: "png" });

    const safeReason = truncateField(reason.trim() || "—", 300);

    const cooldownLine = cooldownUntil
        ? `**Повторная подача:** <t:${cooldownUntil}:D>`
        : `**Повторная подача:** без ограничений`;

    const cooldownRemovedLine = cooldownRemovedBy && cooldownRemovedAt
        ? `**КД снял:** <@${cooldownRemovedBy.id}> | <t:${cooldownRemovedAt}:R>`
        : null;

    const rejectLine = `**Причина отказа:** ${safeReason}`;
    const footerLine = `Отклонил: <@${reviewer.id}> | <t:${rejectedAt}:R> | ID: \`\`${applicationId}\`\``;

    const container = new ContainerBuilder()
        .setAccentColor(15277667)
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Заявка:** ${apply_type.name}`),
                    new TextDisplayBuilder().setContent(`**Заявитель:** ${applicant} | \`\`${applicant.id}\`\``),
                    new TextDisplayBuilder().setContent(`**Подана:** <t:${submittedAt}:R>`),
                ),
        )
        .addSeparatorComponents(divider());

    for (const fieldId of apply_type.fields) {
        const label = APPLY_FIELDS[fieldId]?.label ?? fieldId;
        const rawAnswer = fields[fieldId]?.trim() || "—";
        const answer = truncateField(escapeForCodeBlock(rawAnswer));

        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${label}`))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\`\n${answer}\n\`\`\``))
            .addSeparatorComponents(divider());
    }

    container
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(rejectLine))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(cooldownLine));

    if (cooldownRemovedLine) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cooldownRemovedLine));
    }

    container
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerLine));

    return [container];
};