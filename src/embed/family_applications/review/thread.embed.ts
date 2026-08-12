
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

interface ThreadProps {
    applicationId: string;
    applicant: GuildMember;
    fields: Record<string, string>;
    reviewer: GuildMember;
    apply_type: ApplyType;
    submittedAt: string;
}

function divider(): SeparatorBuilder {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);
}

export const thread_family_applications_embed = ({
    applicationId,
    applicant,
    fields,
    reviewer,
    apply_type,
    submittedAt,
}: ThreadProps) => {
    const avatarUrl = applicant.displayAvatarURL({ size: 128, extension: "png" });

    const footerLine = `<@${reviewer.id}> | <t:${submittedAt}:R> | ID: \`\`${applicationId}\`\``;

    const headerComponents = [
        new TextDisplayBuilder().setContent(`**Заявка:** ${apply_type.name}`),
        new TextDisplayBuilder().setContent(`**Заявитель:** ${applicant} | \`\`${applicant.id}\`\``),
    ];

    const container = new ContainerBuilder()
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
                .addTextDisplayComponents(...headerComponents),
        )
        .addSeparatorComponents(divider());

    for (const fieldId of apply_type.fields) {
        const label = APPLY_FIELDS[fieldId]?.label ?? fieldId;
        const rawAnswer = fields[fieldId]?.trim() || "—";
        const answer = truncateField(escapeForCodeBlock(rawAnswer));

        container
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${label}`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`\`\`\`\n${answer}\n\`\`\``),
            );
    }

    container
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerLine));

    return [container];
};