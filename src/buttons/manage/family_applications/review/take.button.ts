import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import { eq } from "drizzle-orm";
import { INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID, incoming_family_applications_embed } from "../../../../embed/family_applications/review/incoming.embed";
import { Button } from "../../../../types";
import { metaBuilder } from "../../../../utils/logger/met_builder";
import { log } from "../../../../utils/logger";
import { safeReply } from "../../../../utils/safeReply.helper";
import { db } from "../../../../utils/db";
import { applicationSchema } from "../../../../utils/db/schema";
import can_review_application from "../../../../utils/family_applications/can_review.helper";
import { getApplyType } from "../../../../utils/config/family_applications/applyFieldPresets";
import have_previuse from "../../../../utils/family_applications/have_previuse.helper";

export default {
    customId: INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.take,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "take-family-application" });

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            log.button.info(meta, "Defer updated reply");
        } catch (error) {
            log.button.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "family_applications_take.execute", interaction.id);
            return;
        }

        try {
            const appId = interaction.customId
                .replace(`${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.take}:`, "")
                .trim();

            if (!appId) {
                log.button.error(meta, `Could not parse application id from customId:${interaction.customId}`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Попробуйте через пару секунд")],
                });
                return;
            }


            const [application] = await db
                .select()
                .from(applicationSchema)
                .where(eq(applicationSchema.id, appId));

            if (!application) {
                log.button.error(meta, "Could not fetch applications with application ID");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Попробуйте через пару секунд")],
                });
                return;
            }

            const applyType = getApplyType(application.applicationType);
            if (!applyType) {
                log.button.error(meta, `Apply type "${application.applicationType}" no longer exists`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Тип заявки больше недоступен")],
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
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription(`> ${reason}`)],
                });
                return;
            }

            if (application.applicationStatus === "TAKEN") {

                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Вы уже взяли эту заявку")],
                });
                return;
            }

            const applicant = await interaction.guild.members.fetch(application.applicantId).catch(() => null);
            if (!applicant) {
                log.button.error(meta, `Applicant: ${application.applicantId} left server, recommending to reject application`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Участник покинул сервер. Отклоните заявку")],
                });
                return;
            }

            await db
                .update(applicationSchema)
                .set({
                    applicationStatus: "TAKEN",
                    reviewerId: interaction.user.id,
                    takenAt: new Date(),
                })
                .where(eq(applicationSchema.id, appId));

            log.button.info(meta, `Application ${appId} taken by ${interaction.user.id}`);

            const previuse_applications = await have_previuse(application.applicantId);

            await interaction.message.edit({
                components: incoming_family_applications_embed({
                    applicationId: appId,
                    pingRole: applyType.pingRole,
                    applicant,
                    fields: application.answers,
                    reviewer: interaction.member as GuildMember,
                    apply_type: applyType,
                    submittedAt: Math.floor(application.createdAt.getTime() / 1000).toString(),
                    previuse_applications: previuse_applications.length > 0,
                }),
                flags: MessageFlags.IsComponentsV2,
            });

            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("—・Готово").setDescription("> Вы взяли заявку")],
            });
        } catch (error) {
            log.button.error(meta, "Failed to process take application action");
            await safeReply(interaction, error, "family_applications_take.execute", interaction.id);
        }
    },
} satisfies Button;