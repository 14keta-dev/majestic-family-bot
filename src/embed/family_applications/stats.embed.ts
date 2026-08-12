
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import type { ReviewerStatsRow } from "../../utils/family_applications/reviewer_stats_query";

interface ReviewerStats {
    reviewerId: string;
    reviewed: number;
    accepted: number;
    rejected: number;
}

interface StatsProps {
    applications: ReviewerStatsRow[];
    page?: number;
}

const BASE_URL = "embed:manage:family_applications:stats";
const MAX_PER_PAGE = 5;

export const STATS_PAGINATION_CUSTOM_IDS = {
    prev: `${BASE_URL}:page:prev`,
    next: `${BASE_URL}:page:next`,
} as const;

function buildReviewerStats(applications: ReviewerStatsRow[]): ReviewerStats[] {
    const byReviewer = new Map<string, ReviewerStats>();

    for (const application of applications) {
        if (application.applicationStatus !== "ACCEPTED" && application.applicationStatus !== "REJECTED") continue;

        const reviewerId = application.decisionMadeById;
        if (!reviewerId) continue;

        const existing = byReviewer.get(reviewerId) ?? {
            reviewerId,
            reviewed: 0,
            accepted: 0,
            rejected: 0,
        };

        existing.reviewed += 1;
        if (application.applicationStatus === "ACCEPTED") existing.accepted += 1;
        else existing.rejected += 1;

        byReviewer.set(reviewerId, existing);
    }

    return [...byReviewer.values()].sort((a, b) => b.reviewed - a.reviewed);
}

export const manage_stats_family_applications = ({ applications, page = 0 }: StatsProps) => {
    const stats = buildReviewerStats(applications);

    const totalPages = Math.max(1, Math.ceil(stats.length / MAX_PER_PAGE));
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

    const start = currentPage * MAX_PER_PAGE;
    const pageItems = stats.slice(start, start + MAX_PER_PAGE);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Топ проверяющих"),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        );

    if (pageItems.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Пока нет обработанных заявок"),
        );
    }

    pageItems.forEach((reviewer, index) => {
        const rank = start + index + 1;
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**${rank}.** <@${reviewer.reviewerId}> — Обработано: **${reviewer.reviewed}** • Принято: **${reviewer.accepted}** • Отклонено: **${reviewer.rejected}**`,
            ),
        );
    });


    if (totalPages > 1) {
        container
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Страница ${currentPage + 1} / ${totalPages}`),
            )
            .addActionRowComponents(
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("◀")
                            .setCustomId(`${STATS_PAGINATION_CUSTOM_IDS.prev}:${currentPage - 1}`)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("▶")
                            .setCustomId(`${STATS_PAGINATION_CUSTOM_IDS.next}:${currentPage + 1}`)
                            .setDisabled(currentPage >= totalPages - 1),
                    ),
            );
    }

    return [container];
};