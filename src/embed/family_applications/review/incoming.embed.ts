import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    GuildMember,
    MessageActionRowComponentBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from "discord.js";
import { ApplyType } from "../../../utils/config/family_applications/apply_config";
import { APPLY_FIELDS } from "../../../utils/config/family_applications/applyFieldPresets";
import { escapeForCodeBlock, truncateField } from "../../../utils/family_applications/sanitizeText.helper";

interface IncomingProps {
    applicationId: string;
    pingRole: string;
    applicant: GuildMember;
    fields: Record<string, string>;
    reviewer?: GuildMember;
    apply_type: ApplyType;
    submittedAt: string;
    interviewInvitedAt?: string;
    threadId?: string;
    showActions?: boolean;
    previuse_applications?: boolean;
}

function divider(): SeparatorBuilder {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);
}

export const INCOMING_FAMILY_APPLICATIONS_BASE_ID = "embed:family_applications:";

export const INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID = {
    take: `${INCOMING_FAMILY_APPLICATIONS_BASE_ID}take`,
    accept: `${INCOMING_FAMILY_APPLICATIONS_BASE_ID}accept`,
    reject: `${INCOMING_FAMILY_APPLICATIONS_BASE_ID}reject`,
    interview: `${INCOMING_FAMILY_APPLICATIONS_BASE_ID}interview`,
    start_thread: `${INCOMING_FAMILY_APPLICATIONS_BASE_ID}start_thread`,
    previuse_applications: `${INCOMING_FAMILY_APPLICATIONS_BASE_ID}previuse_applications`,
} as const;

type IncomingAction = keyof typeof INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID;

export function buildActionCustomId(action: IncomingAction, applicationId: string): string {
    return `${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID[action]}:${applicationId}`;
}

export function parseIncomingActionCustomId(
    customId: string,
): { action: IncomingAction; applicationId: string } | undefined {
    for (const action of Object.keys(INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID) as IncomingAction[]) {
        const prefix = `${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID[action]}:`;
        if (customId.startsWith(prefix)) {
            return { action, applicationId: customId.slice(prefix.length) };
        }
    }
    return undefined;
}

export const incoming_family_applications_embed = ({
    applicationId,
    pingRole,
    applicant,
    fields,
    reviewer,
    apply_type,
    submittedAt,
    interviewInvitedAt,
    threadId,
    showActions = true,
    previuse_applications = false,
}: IncomingProps) => {
    const avatarUrl = applicant.displayAvatarURL({ size: 128, extension: "png" });

    const footerLine = reviewer
        ? `<@${reviewer.id}> | <t:${submittedAt}:R> | ID: \`\`${applicationId}\`\``
        : `<@&${pingRole}> | <t:${submittedAt}:R> | ID: \`\`${applicationId}\`\``;

    const headerComponents = [
        new TextDisplayBuilder().setContent(`**Заявка:** ${apply_type.name}`),
        new TextDisplayBuilder().setContent(`**Заявитель:** ${applicant} | \`\`${applicant.id}\`\``),
        ...(interviewInvitedAt
            ? [new TextDisplayBuilder().setContent(`**На обзвоне с:** <t:${interviewInvitedAt}:R>`)]
            : []),
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
            )
            .addSeparatorComponents(divider());
    }

    if (threadId) {
        container
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Переписка с заявителем** <#${threadId}>`),
            )
            .addSeparatorComponents(divider());
    }

    if (showActions) {
        const primaryButtons: ButtonBuilder[] = [
            ...(reviewer
                ? []
                : [
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Взять")
                        .setCustomId(buildActionCustomId("take", applicationId)),
                ]),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel("Принять")
                .setCustomId(buildActionCustomId("accept", applicationId)),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setLabel("Отклонить")
                .setCustomId(buildActionCustomId("reject", applicationId)),
            ...(interviewInvitedAt
                ? []
                : [
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Обзвон")
                        .setCustomId(buildActionCustomId("interview", applicationId)),
                ]),
        ];

        const secondaryButtons: ButtonBuilder[] = [
            ...(threadId
                ? []
                : [
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Primary)
                        .setLabel("Начать Переписку")
                        .setCustomId(buildActionCustomId("start_thread", applicationId)),
                ]),
            ...(previuse_applications
                ? [
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("История")
                        .setCustomId(buildActionCustomId("previuse_applications", applicationId)),
                ]
                : []),
        ];

        container.addActionRowComponents(
            new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...primaryButtons),
        );

        if (secondaryButtons.length > 0) {
            container.addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...secondaryButtons),
            );
        }
    }

    container
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerLine));

    return [container];
};