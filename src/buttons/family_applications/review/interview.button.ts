import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags, underline } from "discord.js";
import { eq } from "drizzle-orm";
import { INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID, incoming_family_applications_embed } from "../../../embed/family_applications/review/incoming.embed";
import { Button } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { db } from "../../../utils/db";
import { applicationSchema } from "../../../utils/db/schema";
import can_review_application from "../../../utils/family_applications/can_review.helper";
import { getApplyType } from "../../../utils/config/family_applications/applyFieldPresets";
import { getConfig } from "../../../utils/config/store";
import have_previuse from "../../../utils/family_applications/have_previuse.helper";

export default {
    customId: INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.interview,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "interview-family-application" });

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            log.button.info(meta, "Defer updated reply");
        } catch (error) {
            log.button.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "family_applications_interview.execute", interaction.id);
            return;
        }

        try {
            const appId = interaction.customId
                .replace(`${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.interview}:`, "")
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

            if (application.interviewInvitedAt) {

                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Заявитель уже приглашён на обзвон")],
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


            const config = getConfig();

            const dm_invite = new EmbedBuilder()
                .setTitle("—・Вы были вызваны на обзвон")
                .setDescription(`Зайдите в <#${config.family_applications.channels.interview_channel}> и как только у рекрута появится время, он вас переместит.`);

            try {
                log.button.info(meta, "Trying to invite user to interview via DM");
                await applicant.send({ embeds: [dm_invite] });
            } catch (error) {
                log.button.error(meta, `Could not send dm invite to user error:${error}`);
            }

            if (config.family_applications.channels.status_log) {
                const public_log_channel = await interaction.guild.channels.fetch(config.family_applications.channels.status_log);

                if (!public_log_channel?.isTextBased()) {
                    log.button.error(meta, "status_log channel missing or not text-based; skipping public log");
                } else {
                    const public_invite = new EmbedBuilder()
                        .setTitle("—・Вызван на обзвон")
                        .addFields(
                            {
                                name: "Канал",
                                value: `<#${config.family_applications.channels.interview_channel}>`,
                                inline: false,
                            },
                            {
                                name: "Рассмотрел:",
                                value: `<@${interaction.user.id}> |\`\`${interaction.user.tag}\`\`| ${interaction.user.id}`,
                            },
                        ).setThumbnail(interaction.guild.iconURL()).setTimestamp();

                    await public_log_channel.send({
                        content: `<@${application.applicantId}>`,
                        embeds: [public_invite],
                    });
                }
            }

            const interviewInvitedAt = new Date();


            await db
                .update(applicationSchema)
                .set({ interviewInvitedAt })
                .where(eq(applicationSchema.id, appId));

            log.button.info(meta, `Application ${appId} invited to interview by ${interaction.user.id}`);


            const reviewer = application.reviewerId
                ? await interaction.guild.members.fetch(application.reviewerId).catch(() => null)
                : (interaction.member as GuildMember);

            const previuse_applications = await have_previuse(application.applicantId);

            await interaction.message.edit({
                components: incoming_family_applications_embed({
                    applicationId: appId,
                    pingRole: applyType.pingRole,
                    applicant,
                    fields: application.answers,
                    reviewer: reviewer ?? undefined,
                    apply_type: applyType,
                    submittedAt: Math.floor(application.createdAt.getTime() / 1000).toString(),
                    interviewInvitedAt: Math.floor(interviewInvitedAt.getTime() / 1000).toString(),
                    threadId: application.threadId ?? undefined,
                    previuse_applications: previuse_applications.length > 0,
                }),
                flags: MessageFlags.IsComponentsV2,
            });
            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("—・Готово").setDescription("> Заявитель приглашён на обзвон")],
            });
        } catch (error) {
            log.button.error(meta, "Failed to process interview application action");
            await safeReply(interaction, error, "family_applications_interview.execute", interaction.id);
        }
    },
} satisfies Button;