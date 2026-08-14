import { ColorResolvable, EmbedBuilder } from "discord.js";
import { botAssetEmojis } from "../../utils/emojis/emojis";

export interface VacationSummary {
    userId: string;
    reason: string;
    durationText: string;
    removedRoleCount: number;
    reviewerId?: string;
    rejectReason?: string;
}

function summaryEmbed(summary: VacationSummary, title: string, color: ColorResolvable): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`> <@${summary.userId}> хочет взять отпуск от игры`)
        .addFields(
            { name: "> Причина", value: `${botAssetEmojis.dot} ${summary.reason}`, inline: true },
            { name: "> Длительность", value: `${botAssetEmojis.dot} ${summary.durationText}`, inline: true },
            { name: "> Убрано ролей", value: `${botAssetEmojis.dot} ${summary.removedRoleCount}`, inline: false },
        )
        .setColor(color);

    if (summary.reviewerId) {
        embed.addFields({
            name: "> Проверил",
            value: `${botAssetEmojis.dot} <@${summary.reviewerId}>`,
            inline: false,
        });
    }

    if (summary.rejectReason) {
        embed.addFields({
            name: "> Причина отклонения",
            value: `${botAssetEmojis.dot} ${summary.rejectReason}`,
            inline: false,
        });
    }

    return embed;
}

export const vacation_embeds = {
    request: (summary: VacationSummary) => summaryEmbed(summary, "Запрос на отпуск", 0x282828),
    approved: (summary: VacationSummary) => summaryEmbed(summary, "Отпуск оформлен", "Green"),
    rejected: (summary: VacationSummary) => summaryEmbed(summary, "Отпуск отклонён", "Red"),
    error: (description: string) =>
        new EmbedBuilder().setTitle(`${botAssetEmojis.dot} Ошибка`).setDescription(`> ${description}`),
};