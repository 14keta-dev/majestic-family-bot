import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Button } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { env } from "../../../utils/env";
import { ARCHIVED_EVENT_BUTTONS, ARCHIVED_EVENT_EMBED_BASE_URL } from "../../../embed/EVENT/manage_event/archive_event.embed";
import { event_store } from "../../../utils/EVENT/event.schema";

export const WHO_SUBMITTED_BUTTON_BASE_URL = `${ARCHIVED_EVENT_EMBED_BASE_URL}:${ARCHIVED_EVENT_BUTTONS.who_submitted}`;

function formatList(userIds: string[]): string {
    if (userIds.length === 0) return "Пусто";
    return userIds.map((id, index) => `${index + 1}. <@${id}>`).join("\n");
}

export default {
    customId: WHO_SUBMITTED_BUTTON_BASE_URL,
    dynamic: true,
    ephemeralDefer: true,
    defer: true,
    async execute(interaction: ButtonInteraction) {
        const meta = metaBuilder(interaction.user, env.GUILD_ID ?? "unknown", { button: "who_submitted" });

        const eventId = interaction.customId
            .replace(`${WHO_SUBMITTED_BUTTON_BASE_URL}:`, "")
            .trim();

        if (!eventId) {
            log.button.warn(meta, `Could not parse event id from customId "${interaction.customId}"`);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Попробуйте через пару секунд")],
            });
            return;
        }

        const event = event_store.get(eventId);

        if (!event) {
            log.button.warn(meta, `Event ${eventId} not found when checking who submitted`);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Событие не найдено")],
            });
            return;
        }

        const mainList = event.mainListParticipant ?? [];
        const submittedIds = new Set((event.replaysSubmitted ?? []).map((r) => r.user));

        const submitted = mainList.filter((userId) => submittedIds.has(userId));
        const pending = mainList.filter((userId) => !submittedIds.has(userId));

        const replayByUser = new Map((event.replaysSubmitted ?? []).map((r) => [r.user, r.link]));

        const submittedLines = submitted.length
            ? submitted
                .map((id, index) => `${index + 1}. <@${id}> — [ссылка](${replayByUser.get(id)})`)
                .join("\n")
            : "Пусто";

        const embed = new EmbedBuilder()
            .setTitle("Статус откатов")
            .setDescription(
                `**Залили (${submitted.length}/${mainList.length}):**\n${submittedLines}\n\n` +
                `**Не залили (${pending.length}/${mainList.length}):**\n${formatList(pending)}`
            );

        await interaction.editReply({ embeds: [embed] });

        log.button.debug(meta, `Checked replay status for event ${eventId}: submitted=${submitted.length} pending=${pending.length}`);
    },
} satisfies Button;