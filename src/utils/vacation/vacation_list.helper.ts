import { EmbedBuilder } from "discord.js";
import { formatDateTimeDDMMYYYY, formatVacationDuration, listActiveVacations, Vacation_schema } from "./vacation.schema";
import { vacation_components } from "../../embed/vacation/vacation.components";
import { botAssetsEmojis } from "../emojis/emojis";

const EMBED_COLOR = 0x282828;

export const VACATION_LIST_PAGE_SIZE = 5;

export function chunk<T>(items: T[], size: number): T[][] {
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        pages.push(items.slice(i, i + size));
    }
    return pages;
}

function formatVacationListEntry(v: Vacation_schema): string {
    return [
        `${botAssetsEmojis.dot} <@${v.userId}>`,
        `**Длительность:** ${formatVacationDuration(v.estimated_end)}`,
        `**Причина:** ${v.reason}`,
        `**Дата:** ${formatDateTimeDDMMYYYY(new Date(v.startedAt))}`,
        `**Ролей снято:** ${v.roles_romeved.length}`,
    ].join("\n");
}

export function buildVacationListEmbed(pages: Vacation_schema[][], page: number, total: number): EmbedBuilder {
    const description = pages[page].map(formatVacationListEntry).join("\n\n");

    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(`${botAssetsEmojis.vacation} Сейчас в отпуске`)
        .setDescription(description)
        .setFooter({ text: `Страница ${page + 1}/${pages.length} • Всего: ${total}` });
}

export async function renderVacationListPage(
    currentPage: number,
    direction: 1 | -1,
): Promise<{
    embeds: EmbedBuilder[];
    components: ReturnType<typeof vacation_components.listPaginationRow>[];
}> {
    const active = listActiveVacations();
    const pages = chunk(active, VACATION_LIST_PAGE_SIZE);

    if (pages.length === 0) {
        return {
            embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription("Сейчас никто не в отпуске.")],
            components: [],
        };
    }

    const targetPage = Math.min(Math.max(currentPage + direction, 0), pages.length - 1);

    return {
        embeds: [buildVacationListEmbed(pages, targetPage, active.length)],
        components: pages.length > 1 ? [vacation_components.listPaginationRow(targetPage, pages.length)] : [],
    };
}