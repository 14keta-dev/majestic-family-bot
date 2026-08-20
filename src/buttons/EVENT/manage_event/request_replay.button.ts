import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { Button } from "../../../types";
import { log } from "../../../utils/logger";
import { env } from "../../../utils/env";
import { ARCHIVED_EVENT_BUTTONS, ARCHIVED_EVENT_EMBED_BASE_URL } from "../../../embed/EVENT/manage_event/archive_event.embed";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { event_store } from "../../../utils/EVENT/event.schema";
import { dm_request_replay_embed } from "../../../embed/EVENT/manage_event/dm_replay_request.embed";
import { dmFanout } from "../../../utils/EVENT/manage_event/dm_fanout.helper";



export const REQUEST_REPLAY_BUTTON_BASE_URL = `${ARCHIVED_EVENT_EMBED_BASE_URL}:${ARCHIVED_EVENT_BUTTONS.request_replay}`;

export default {
    customId: REQUEST_REPLAY_BUTTON_BASE_URL,
    dynamic: true,
    ephemeralDefer: true,
    defer: true,
    async execute(interaction: ButtonInteraction) {
        const meta = metaBuilder(interaction.user, env.GUILD_ID ?? "unknown", { button: "request_replay" });

        const eventId = interaction.customId
            .replace(`${REQUEST_REPLAY_BUTTON_BASE_URL}:`, "")
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
            log.button.warn(meta, `Event ${eventId} not found when requesting replays`);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Событие не найдено")],
            });
            return;
        }

        const mainList = event.mainListParticipant ?? [];

        if (mainList.length === 0) {
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> В основном списке никого нет")],
            });
            return;
        }

        const submitted = new Set((event.replaysSubmitted ?? []).map((r) => r.user));
        const pending = mainList.filter((userId) => !submitted.has(userId));

        if (pending.length === 0) {
            await interaction.editReply({
                embeds: [new EmbedBuilder().setDescription("> Все уже залили откаты")],
            });
            return;
        }

        const dmPayload = dm_request_replay_embed({ event });
        const { sent, failed } = await dmFanout({
            client: interaction.client,
            userIds: pending,
            payload: dmPayload,
        });

        const summaryLines = [`**Запросы отправлены:** ${sent.length}/${pending.length}`];

        if (failed.length > 0) {
            summaryLines.push(
                "",
                `**Не удалось отправить (закрыты ЛС):**`,
                failed.map((id) => `<@${id}>`).join(", "),
            );
            log.button.debug(meta, `Failed to DM replay request to some users for event ${eventId}`, { failed });
        }

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Запрос откатов")
                    .setDescription(summaryLines.join("\n")),
            ],
        });

        log.button.info(meta, `Requested replays for event ${eventId}: sent=${sent.length} failed=${failed.length}`);
    },
} satisfies Button;