import { EmbedBuilder, GuildMember, MessageFlags, ModalSubmitInteraction, ThreadAutoArchiveDuration } from "discord.js";
import { CREATE_EVENT_MODAL_CUSTOM_IDS } from "../../buttons/EVENT/create.button";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { getConfig } from "../../utils/config/store";
import { safeReply } from "../../utils/safeReply.helper";
import { nanoid } from "nanoid";
import { parseFlexibleDateTime } from "../../utils/EVENT/format_date";
import { event_store } from "../../utils/EVENT/event.schema";
import { event_tag_embed } from "../../embed/EVENT/tag.embed";

export default {
    customId: CREATE_EVENT_MODAL_CUSTOM_IDS.modal,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.member || !interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const meta = metaBuilder(interaction.member as GuildMember, { modal: "create_mp" });

        try {
            const description_input = interaction.fields.getTextInputValue(CREATE_EVENT_MODAL_CUSTOM_IDS.description).trim();
            const max_participants_raw = interaction.fields.getTextInputValue(CREATE_EVENT_MODAL_CUSTOM_IDS.participants).trim();
            const start_time_raw = interaction.fields.getTextInputValue(CREATE_EVENT_MODAL_CUSTOM_IDS.start_time).trim();

            const mp_type = interaction.customId
                .replace(`${CREATE_EVENT_MODAL_CUSTOM_IDS.modal}:`, "")
                .trim();

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

            let start_time_iso: string;
            try {
                start_time_iso = parseFlexibleDateTime(start_time_raw);
            } catch {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Неверный формат времени. Пример: `14.30 21.08`")]
                });
                return;
            }

            const config = getConfig().event;
            const mp = config.find((m) => m.name === mp_type);

            if (!mp) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Такого мп более не существует")]
                });
                return;
            }

            const tag_channel = await interaction.guild.channels.fetch(mp.tag_channel);

            if (!tag_channel || !tag_channel.isTextBased()) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("Ошибка").setDescription("> Канал для создания МП не найден или не текстовый")]
                });
                return;
            }

            const id = nanoid();
            const start_time_unix = Math.floor(new Date(start_time_iso).getTime() / 1000);

            const tag_embed = event_tag_embed({
                id,
                name: mp.name,
                registrationOpen: true,
                description: description_input,
                maxParticipants: max_participants,
                mainList: [],
                replacementList: [],
                startTime: String(start_time_unix),
            });

            const sent_message = await tag_channel.send({
                components: tag_embed,
                flags: MessageFlags.IsComponentsV2,
            });

            const thread = await sent_message.startThread({
                name: mp.name,
                autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
                reason: mp.name,
            })

            await event_store.create_event({
                id,
                type: mp_type,
                createdBy: interaction.user.id,
                description: description_input,
                maxParticipants: max_participants_raw,
                startTime: start_time_raw,
                messageId: sent_message.id,
                threadId: thread.id
            });

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Готово")
                        .setDescription(`> МП **${mp.name}** создано: <#${tag_channel.id}>`)
                ]
            });
        } catch (error) {
            log.modal.error(meta, "Failed to process create mp modal");
            await safeReply(interaction, error, "create_mp_modal.execute", interaction.id);
        }
    }
} satisfies Modal;