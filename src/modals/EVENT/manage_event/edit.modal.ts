import { EmbedBuilder, GuildMember, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { EDIT_EVENT_MODAL_CUSTOM_IDS } from "../../../utils/EVENT/manage_event/edit";
import { event_store } from "../../../utils/EVENT/event.schema";
import { parseFlexibleDateTime } from "../../../utils/EVENT/format_date";
import { updateEventEmbed } from "../../../utils/EVENT/update_embed";

export default {
    customId: EDIT_EVENT_MODAL_CUSTOM_IDS.modal,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const meta = metaBuilder(interaction.member as GuildMember, { modal: "edit_mp" });

        const eventId = interaction.customId
            .replace(`${EDIT_EVENT_MODAL_CUSTOM_IDS.modal}:`, "")
            .trim();

        if (!eventId) {
            log.modal.warn(meta, `Could not parse event id from customid: ${interaction.customId}`);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Произошла ошибка попробуйте через пару секунд")]
            });
            return;
        }

        const event = event_store.get(eventId);

        if (!event) {
            log.modal.warn(meta, `Could not fetch event from db: ${eventId}`);
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Мп закончилось")]
            });
            return;
        }

        try {
            const description_input = interaction.fields.getTextInputValue(`${EDIT_EVENT_MODAL_CUSTOM_IDS.description}:${eventId}`).trim();
            const max_participants_raw = interaction.fields.getTextInputValue(`${EDIT_EVENT_MODAL_CUSTOM_IDS.participants}:${eventId}`).trim();
            const start_time_raw = interaction.fields.getTextInputValue(`${EDIT_EVENT_MODAL_CUSTOM_IDS.start_time}:${eventId}`).trim();

            if (!description_input || !max_participants_raw || !start_time_raw) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Заполните все поля")]
                });
                return;
            }

            const max_participants = Number(max_participants_raw);
            if (!Number.isInteger(max_participants) || max_participants <= 0) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Укажите корректное число участников")]
                });
                return;
            }

            const currentMainCount = event.mainListParticipant?.length ?? 0;
            if (max_participants < currentMainCount) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription(`> В основном списке уже ${currentMainCount} участников, нельзя указать лимит меньше`)]
                });
                return;
            }

            let start_time_iso: string;
            try {
                start_time_iso = parseFlexibleDateTime(start_time_raw);
            } catch {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Неверный формат времени. Пример: `14.30 21.08`")]
                });
                return;
            }

            const updated = await event_store.updateLocked(eventId, {
                description: description_input,
                maxParticipants: max_participants,
                startTime: start_time_iso,
            });

            if (!updated) {
                log.modal.warn(meta, `Event disappeared during update`, { eventId });
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Мп закончилось")]
                });
                return;
            }

            await updateEventEmbed(interaction.client, updated);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Готово")
                        .setDescription(`> МП **${updated.type}** обновлено`)
                ]
            });
        } catch (error) {
            log.modal.error(meta, "Failed to process edit mp modal");
            await safeReply(interaction, error, "edit_mp_modal.execute", interaction.id);
        }
    }
} satisfies Modal;