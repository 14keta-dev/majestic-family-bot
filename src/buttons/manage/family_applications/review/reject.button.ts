import {
    ActionRowBuilder,
    ButtonInteraction,
    EmbedBuilder,
    GuildMember,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID } from "../../../../embed/family_applications/review/incoming.embed";
import { Button } from "../../../../types";
import { metaBuilder } from "../../../../utils/logger/met_builder";
import { log } from "../../../../utils/logger";
import { safeReply } from "../../../../utils/safeReply.helper";
import { applicationSchema } from "../../../../utils/db/schema";
import { db } from "../../../../utils/db";
import { eq } from "drizzle-orm";
import can_review_application from "../../../../utils/family_applications/can_review.helper";
import { getApplyType } from "../../../../utils/config/family_applications/applyFieldPresets";

export default {
    customId: INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.reject,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "reject-family-applications" });


        try {
            const appId = interaction.customId
                .replace(`${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.reject}:`, "")
                .trim();

            if (!appId) {
                log.button.error(meta, `Could not parse application id from customId:${interaction.customId}`);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Попробуйте через пару секунд")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const [application] = await db
                .select()
                .from(applicationSchema)
                .where(eq(applicationSchema.id, appId));

            if (!application) {
                log.button.error(meta, "Could not fetch applications with application ID");
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Попробуйте через пару секунд")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (application.applicationStatus !== "OPEN" && application.applicationStatus !== "TAKEN") {
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> По заявке уже принято решение")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const applyType = getApplyType(application.applicationType);
            if (!applyType) {
                log.button.error(meta, `Apply type "${application.applicationType}" no longer exists`);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Тип заявки больше недоступен")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const can_manage = await can_review_application({
                member: interaction.member as GuildMember,
                application_kind: application.applicationType,
                takenByUserId: application.reviewerId ?? undefined,
            });

            if (!can_manage) {
                const reason = application.reviewerId
                    ? "Заявка уже взята другим ревьюером"
                    : "У вас нет прав для взаимодействия с этой заявкой";
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription(`> ${reason}`)],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const applicant = await interaction.guild.members.fetch(application.applicantId).catch(() => null);
            if (!applicant) {
                log.button.error(meta, `Applicant: ${application.applicantId} left server, recommending to reject application`);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Участник покинул сервер. Отклоните заявку")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const reasonInput = new TextInputBuilder()
                .setCustomId("reason")
                .setLabel("Причина отклонения")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Укажите причину, по которой заявка отклоняется")
                .setMinLength(1)
                .setMaxLength(1000)
                .setRequired(true);

            const cooldownInput = new TextInputBuilder()
                .setCustomId("cooldown")
                .setLabel("Кулдаун до повторной подачи")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Дефолт 2. Если 0 то участник может подать заявку без кд")
                .setMaxLength(4)
                .setRequired(false);

            const modal = new ModalBuilder()
                .setCustomId(`${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.reject}:modal:${appId}`)
                .setTitle("Отклонение заявки")
                .addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(cooldownInput),
                );

            await interaction.showModal(modal);
        } catch (error) {
            log.button.error(meta, "Unhandled error in reject-family-applications button");
            await safeReply(interaction, error, "family_applications_reject.execute", interaction.id);
        }
    }
} satisfies Button;