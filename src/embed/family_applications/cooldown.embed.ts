
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageActionRowComponentBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";


export interface CooldownApplication {
    id: string;
    applicantId: string;
    coolDownUntil: Date | null;
    archiveMessageId: string | null;
}

interface CooldownProps {
    applications: CooldownApplication[];
    guildId: string;
    archiveChannelId: string;
    page?: number;
};

const BASE_URL = "embed:manage:family_applications:cooldown";
const MAX_PER_PAGE = 7;

export const REMOVE_COOLDOWN_EMBED_CUSTOM_IDS = {
    remove: `${BASE_URL}:remove`,
}

export const COOLDOWN_PAGINATION_CUSTOM_IDS = {
    prev: `${BASE_URL}:page:prev`,
    next: `${BASE_URL}:page:next`,
}

export const manage_cooldown_family_applications = ({ applications, guildId, archiveChannelId, page = 0 }: CooldownProps) => {
    const totalPages = Math.max(1, Math.ceil(applications.length / MAX_PER_PAGE));
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

    const start = currentPage * MAX_PER_PAGE;
    const pageItems = applications.slice(start, start + MAX_PER_PAGE);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## Активный cooldown"),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        );

    if (pageItems.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Нет заявок с активным cooldown"),
        );
    }

    for (const application of pageItems) {
        const timestamp = application.coolDownUntil
            ? Math.floor(application.coolDownUntil.getTime() / 1000)
            : null;

        const archiveLink = application.archiveMessageId
            ? `[архив](https://discord.com/channels/${guildId}/${archiveChannelId}/${application.archiveMessageId})`
            : "архив недоступен";

        container
            .addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("Снять КД")
                            .setCustomId(`${REMOVE_COOLDOWN_EMBED_CUSTOM_IDS.remove}:${currentPage}:${application.id}`)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `<@${application.applicantId}> — ${timestamp ? `<t:${timestamp}:R>` : "неизвестно"} • ${archiveLink}`
                        ),
                    ),
            )
    }
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
                            .setCustomId(`${COOLDOWN_PAGINATION_CUSTOM_IDS.prev}:${currentPage - 1}`)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Secondary)
                            .setLabel("▶")
                            .setCustomId(`${COOLDOWN_PAGINATION_CUSTOM_IDS.next}:${currentPage + 1}`)
                            .setDisabled(currentPage >= totalPages - 1),
                    ),
            );
    }

    return [container];
}