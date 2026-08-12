import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags, ChannelType } from "discord.js";
import { and, eq, inArray } from "drizzle-orm";
import { INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID } from "../../../../embed/family_applications/review/incoming.embed";
import { accepted_archive_family_applications_embed } from "../../../../embed/family_applications/review/accepted_archive.embed";
import { Button } from "../../../../types";
import { metaBuilder } from "../../../../utils/logger/met_builder";
import { log } from "../../../../utils/logger";
import { safeReply } from "../../../../utils/safeReply.helper";
import { db } from "../../../../utils/db";
import { applicationSchema } from "../../../../utils/db/schema";
import { getApplyType } from "../../../../utils/config/family_applications/applyFieldPresets";
import can_review_application from "../../../../utils/family_applications/can_review.helper";
import { getConfig } from "../../../../utils/config/store";

export default {
    customId: INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.accept,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "accept-family-applications" });

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            log.button.info(meta, "Defer updated reply");
        } catch (error) {
            log.button.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "family_applications_accept.execute", interaction.id);
            return;
        }

        try {
            const appId = interaction.customId
                .replace(`${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.accept}:`, "")
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

            if (application.applicationStatus !== "OPEN" && application.applicationStatus !== "TAKEN") {
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> По заявке уже принято решение")],
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

            const applicant = await interaction.guild.members.fetch(application.applicantId).catch(() => null);
            if (!applicant) {
                log.button.error(meta, `Applicant: ${application.applicantId} left server, recommending to reject application`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Участник покинул сервер. Отклоните заявку")],
                });
                return;
            }

            const config = getConfig();
            const archiveChannelId = config.family_applications.channels.accepted_archive;
            const archiveChannel = await interaction.guild.channels.fetch(archiveChannelId).catch(() => null);

            if (!archiveChannel?.isTextBased()) {
                log.button.error(meta, "accepted_archive channel missing or not text-based");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Канал архива не настроен")],
                });
                return;
            }
            const botMember = interaction.guild.members.me;
            const canPostInArchive = botMember
                ? archiveChannel.permissionsFor(botMember)?.has(["ViewChannel", "SendMessages"])
                : false;

            if (!canPostInArchive) {
                log.button.error(meta, "Bot lacks permission to post in accepted_archive channel");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Нет прав на отправку в канал архива")],
                });
                return;
            }


            const decisionMadeAt = new Date();

            const [claimed] = await db
                .update(applicationSchema)
                .set({
                    applicationStatus: "ACCEPTED",
                    decisionMadeById: interaction.user.id,
                    decisionMadeAt,
                    updatedAt: decisionMadeAt,
                    reviewerId: interaction.user.id,
                })
                .where(
                    and(
                        eq(applicationSchema.id, appId),
                        inArray(applicationSchema.applicationStatus, ["OPEN", "TAKEN"]),
                    ),
                )
                .returning();

            if (!claimed) {
                log.button.info(meta, `Application ${appId} already decided by someone else, lost the race`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> По заявке уже принято решение")],
                });
                return;
            }



            const reviewer = application.reviewerId
                ? await interaction.guild.members.fetch(application.reviewerId).catch(() => null)
                : (interaction.member as GuildMember);


            const sideEffects = await Promise.allSettled([

                applyType.rewardRoles.length > 0
                    ? applicant.roles.add(applyType.rewardRoles)
                    : Promise.resolve(),


                applicant.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("—・Ваша заявка принята")
                            .setDescription(`Поздравляем, вы приняты в семью!`),
                    ],
                }),


                (async () => {
                    if (!application.threadId) return;
                    const reviewChannel = await interaction.guild!.channels.fetch(application.threadId).catch(() => null);
                    if (!reviewChannel) return;
                    await reviewChannel.delete(`Заявка ${appId} принята — ${interaction.user.tag}`);
                })(),
            ]);

            const [roleResult, dmResult, threadResult] = sideEffects;
            if (roleResult.status === "rejected") {
                log.button.error(meta, `Could not add reward roles to applicant error:${roleResult.reason}`);
            }
            if (dmResult.status === "rejected") {
                log.button.error(meta, `Could not send dm accept to user error:${dmResult.reason}`);
            }
            if (threadResult.status === "rejected") {
                log.button.error(meta, `Could not delete review thread error:${threadResult.reason}`);
            }


            let archiveMessageId: string | null = null;
            try {
                const archiveMessage = await archiveChannel.send({
                    components: accepted_archive_family_applications_embed({
                        applicationId: appId,
                        applicant,
                        fields: application.answers,
                        reviewer: reviewer ?? (interaction.member as GuildMember),
                        apply_type: applyType,
                        submittedAt: Math.floor(application.createdAt.getTime() / 1000).toString(),
                        acceptedAt: Math.floor(decisionMadeAt.getTime() / 1000).toString(),
                    }),
                    flags: MessageFlags.IsComponentsV2,
                });
                archiveMessageId = archiveMessage.id;
            } catch (error) {
                log.button.error(meta, `CRITICAL: application ${appId} marked ACCEPTED but failed to post archive message error:${error}`);
            }

            if (archiveMessageId) {
                await db
                    .update(applicationSchema)
                    .set({ archiveMessageId })
                    .where(eq(applicationSchema.id, appId))
                    .catch((error) => {
                        log.button.error(meta, `Could not persist archiveMessageId for application ${appId} error:${error}`);
                    });
            }

            if (config.family_applications.channels.status_log) {
                try {
                    const public_log_channel = await interaction.guild.channels.fetch(config.family_applications.channels.status_log);

                    if (public_log_channel?.isTextBased()) {
                        await public_log_channel.send({
                            content: `<@${application.applicantId}>`,
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("—・Заявка принята")
                                    .setDescription("Ваша заявка на вступление в семью была **одобрена!** Поздравляем!")
                                    .addFields(
                                        {
                                            name: "Принял:",
                                            value: `<@${interaction.user.id}> |\`\`${interaction.user.tag}\`\`| ${interaction.user.id}`,
                                        },
                                    )
                                    .setThumbnail(interaction.guild.iconURL()).setTimestamp().setColor("Green"),
                            ],
                        });
                    } else {
                        log.button.error(meta, "status_log channel missing or not text-based; skipping public log");
                    }
                } catch (error) {
                    log.button.error(meta, `Could not send public accept log error:${error}`);
                }
            }

            log.button.info(meta, `Application ${appId} accepted by ${interaction.user.id}, archived and removed from incoming`);


            try {
                await interaction.message.delete();
            } catch (error) {
                log.button.error(meta, `Could not delete incoming application message error:${error}`);
            }

            await interaction.editReply({
                embeds: [new EmbedBuilder().setTitle("—・Готово").setDescription("> Заявка принята")],
            });
        } catch (error) {
            log.button.error(meta, "Failed to process accept application action");
            await safeReply(interaction, error, "family_applications_accept.execute", interaction.id);
        }
    },
} satisfies Button;