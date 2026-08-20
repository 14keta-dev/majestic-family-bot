import { EmbedBuilder, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { SUBMIT_EVENT_REPLY_MODAL } from "../../buttons/EVENT/manage_event/submit_replay.button";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { env } from "../../utils/env";
import { event_store } from "../../utils/EVENT/event.schema";

export default {
    customId: SUBMIT_EVENT_REPLY_MODAL.modal,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        const meta = metaBuilder(interaction.user, env.GUILD_ID ?? "unknown", { modal: "submit_replay" });

        const eventId = interaction.customId
            .replace(`${SUBMIT_EVENT_REPLY_MODAL.modal}:`, "")
            .trim();

        if (!eventId) {
            log.modal.warn(meta, `Could not parse event id from customId "${interaction.customId}"`);
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Попробуйте через пару секунд")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const link_input = interaction.fields
            .getTextInputValue(`${SUBMIT_EVENT_REPLY_MODAL.link}:${eventId}`)
            .trim();

        if (!link_input) {
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Оставьте ссылку на откат")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const event = event_store.get(eventId);

        if (!event) {
            log.modal.warn(meta, `Event ${eventId} not found on modal submit`);
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Событие не найдено")],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const replay_thread = await interaction.client.channels
                .fetch(event.archiveThreadId)
                .catch((error) => {
                    log.modal.error(meta, `Failed to fetch thread ${event.archiveThreadId} for event ${eventId}: ${error}`);
                    return null;
                });

            if (!replay_thread || !replay_thread.isThread()) {
                log.modal.warn(meta, `Thread ${event.archiveThreadId} for event ${eventId} is missing or not a thread channel`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Не удалось найти тред для отката")],
                });
                return;
            }

            const result = await event_store.submit_replay(eventId, interaction.user.id, link_input);

            if (result.status === "not_found") {
                log.modal.warn(meta, `Event ${eventId} vanished between fetch and submit_replay`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Событие не найдено")],
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle("Откат")
                .setDescription(`> <@${interaction.user.id}>\n> Откат: ${link_input}`);

            await replay_thread.send({ embeds: [embed] });

            if (interaction.message?.editable) {
                await interaction.message.edit({ components: [] }).catch((error) => {
                    log.modal.warn(meta, `Failed to clear components after replay submit: ${error}`);
                });
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder().setTitle(result.status === "updated" ? "Обновлено" : "Готово"),
                ],
            });
        } catch (error) {
            log.modal.error(meta, `Error while submitting replay for event ${eventId}: ${error}`);
            await interaction
                .editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Что-то пошло не так, попробуйте снова")],
                })
                .catch(() => undefined);
        }
    },
} satisfies Modal;