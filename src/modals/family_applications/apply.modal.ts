
import { ModalSubmitInteraction, MessageFlags, GuildTextBasedChannel, EmbedBuilder } from "discord.js";
import { parseApplyModalCustomId, APPLY_MODAL_PREFIX } from "../../utils/family_applications/buildApplyModal";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig } from "../../utils/config/store";
import { log } from "../../utils/logger";
import { can_apply_to_family } from "../../utils/family_applications/can_apply";
import { db } from "../../utils/db";
import { applicationSchema } from "../../utils/db/schema";
import { Modal } from "../../types";
import { safeReply } from "../../utils/safeReply.helper";
import { getApplyType } from "../../utils/config/family_applications/applyFieldPresets";
import { incoming_family_applications_embed } from "../../embed/family_applications/review/incoming.embed";
import { eq } from "drizzle-orm";
import have_previuse from "../../utils/family_applications/have_previuse.helper";

export default {
    customId: APPLY_MODAL_PREFIX,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) return;

        const applyTypeId = parseApplyModalCustomId(interaction.customId);
        if (!applyTypeId) return;

        const meta = metaBuilder(interaction.member, { modal: "family_applications_apply", applyTypeId });

        try {
            const config = getConfig().family_applications;


            if (!config.active) {
                await interaction.reply({ content: "Набор сейчас закрыт.", flags: MessageFlags.Ephemeral });
                return;
            }

            const applyType = getApplyType(applyTypeId);
            if (!applyType) {
                log.modal.error(meta, `Apply type "${applyTypeId}" no longer exists`);
                await interaction.reply({
                    content: "Этот тип заявки больше недоступен.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const eligibility = await can_apply_to_family(interaction.member);
            if (!eligibility.status) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("—・Ошибка")
                            .setDescription(`> ${eligibility.message ?? "Вы не можете подать заявку сейчас."}`),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const answers: Record<string, string> = {};
            for (const fieldId of applyType.fields) {
                answers[fieldId] = interaction.fields.getTextInputValue(fieldId);
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });


            const incomingChannel = await interaction.guild.channels.fetch(config.channels.incoming_applications);
            if (!incomingChannel || !incomingChannel.isTextBased()) {
                log.modal.error(meta, "incoming_applications channel missing or not text-based");
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("—・Ошибка")
                            .setDescription("> Не удалось отправить заявку. Обратитесь к администрации."),
                    ],
                });
                return;
            }

            const previuse_applications = await have_previuse(interaction.user.id);

            const [inserted] = await db
                .insert(applicationSchema)
                .values({
                    applicantId: interaction.user.id,
                    applicationType: applyType.id,
                    answers,
                    applicationMessageId: "",
                })
                .returning({ id: applicationSchema.id });

            const submittedAt = Math.floor(Date.now() / 1000).toString();

            const applicationMessage = await (incomingChannel as GuildTextBasedChannel).send({
                components: incoming_family_applications_embed({
                    applicationId: String(inserted.id),
                    pingRole: applyType.pingRole,
                    applicant: interaction.member,
                    fields: answers,
                    apply_type: applyType,
                    submittedAt,
                    previuse_applications: previuse_applications.length > 0,
                }),
                flags: MessageFlags.IsComponentsV2,
            });

            await db
                .update(applicationSchema)
                .set({ applicationMessageId: applicationMessage.id })
                .where(eq(applicationSchema.id, inserted.id));

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("—・Готово")
                        .setDescription("> Ваша заявка отправлена! Ожидайте рассмотрения."),
                ],
            });

            log.modal.info(meta, `Application submitted for type "${applyType.id}", db id ${inserted.id}`);
        } catch (error) {
            log.modal.error(meta, "Failed to process apply modal submission");
            await safeReply(interaction, error, "family_applications_apply_modal.execute", interaction.id);
        }
    },
} satisfies Modal;