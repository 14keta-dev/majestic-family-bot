import { ButtonInteraction, ChannelType, EmbedBuilder, GuildMember, MessageFlags, OverwriteResolvable, PermissionFlagsBits } from "discord.js";
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
import { getConfig } from "../../../../utils/config/store";
import { thread_family_applications_embed } from "../../../../embed/family_applications/review/thread.embed";
import have_previuse from "../../../../utils/family_applications/have_previuse.helper";


function toChannelSlug(input: string): string {
    const slug = input
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return slug || "applicant";
}

export default {
    customId: INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.start_thread,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "thread-family-application" });

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            log.button.info(meta, "Defer updated reply");
        } catch (error) {
            log.button.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "family_applications_thread.execute", interaction.id);
            return;
        }

        try {

            const appId = interaction.customId
                .replace(`${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.start_thread}:`, "")
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

            if (application.threadId) {
                log.button.info(meta, `Thread already exists: ${application.threadId}`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription(`> Переписка уже существует <#${application.threadId}>`)],
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

            const reviewer = application.reviewerId
                ? (await interaction.guild.members.fetch(application.reviewerId).catch(() => null)) ?? (interaction.member as GuildMember)
                : (interaction.member as GuildMember);

            const config = getConfig();
            const { priority_roles } = config.family_applications;

            const permissionOverwrites: OverwriteResolvable[] = [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: applyType.pingRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                },
                ...priority_roles.map((roleId): OverwriteResolvable => ({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                })),
                {
                    id: applicant.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                },

                ...(application.reviewerId
                    ? [{
                        id: application.reviewerId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    } satisfies OverwriteResolvable]
                    : []),
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                },
            ];

            const reviewChannel = await interaction.guild.channels.create({
                name: `заявка-${toChannelSlug(applicant.user.username)}`,
                type: ChannelType.GuildText,

                parent: interaction.channel && "parentId" in interaction.channel ? interaction.channel.parentId : undefined,
                permissionOverwrites,
            });

            log.button.info(meta, `Created review channel ${reviewChannel.id} for application ${appId}`);

            await reviewChannel.send({
                components: thread_family_applications_embed({
                    applicationId: appId,
                    applicant,
                    fields: application.answers,
                    reviewer,
                    apply_type: applyType,
                    submittedAt: Math.floor(application.createdAt.getTime() / 1000).toString(),
                }),
                flags: MessageFlags.IsComponentsV2,
            });

            await db
                .update(applicationSchema)
                .set({ threadId: reviewChannel.id })
                .where(eq(applicationSchema.id, appId));

            const previuse_applications = await have_previuse(application.applicantId);

            await interaction.message.edit({
                components: incoming_family_applications_embed({
                    applicationId: appId,
                    pingRole: applyType.pingRole,
                    applicant,
                    fields: application.answers,
                    reviewer,
                    apply_type: applyType,
                    submittedAt: Math.floor(application.createdAt.getTime() / 1000).toString(),
                    interviewInvitedAt: application.interviewInvitedAt
                        ? Math.floor(application.interviewInvitedAt.getTime() / 1000).toString()
                        : undefined,
                    threadId: reviewChannel.id,
                    previuse_applications: previuse_applications.length > 0,
                }),
                flags: MessageFlags.IsComponentsV2,
            });

            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("—・Готово").setDescription(`> Переписка создана: <#${reviewChannel.id}>`)],
            });
        } catch (error) {
            log.button.error(meta, "Failed to process start_thread application action");
            await safeReply(interaction, error, "family_applications_thread.execute", interaction.id);
        }
    },
} satisfies Button;