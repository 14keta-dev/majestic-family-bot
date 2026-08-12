import { EmbedBuilder, GuildMember, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { and, eq, inArray } from "drizzle-orm";
import { INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID } from "../../../embed/family_applications/review/incoming.embed";
import { rejected_archive_family_applications_embed } from "../../../embed/family_applications/review/rejected_archive.embed";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { safeReply } from "../../../utils/safeReply.helper";
import { log } from "../../../utils/logger";
import { db } from "../../../utils/db";
import { applicationSchema } from "../../../utils/db/schema";
import { getApplyType } from "../../../utils/config/family_applications/applyFieldPresets";
import can_review_application from "../../../utils/family_applications/can_review.helper";
import { getConfig } from "../../../utils/config/store";
import { Modal } from "../../../types";

const MODAL_PREFIX = `${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.reject}:modal:`;

const DEFAULT_COOLDOWN_DAYS = 2;

const RejectedPublicLogEmbed = ({
    reviwerId,
    reason,
    reviwerTag,
    guildIcon,
}: {
    reviwerId: string;
    reviwerTag: string;
    reason: string;
    guildIcon: string | null;
}) => {
    const embed = new EmbedBuilder()
        .setTitle("—・Заявка отклонена")
        .setDescription("Ваша заявка на вступление в семью была отклонена.")
        .addFields(
            { name: "Причина:", value: reason, inline: false },
            {
                name: "Рассмотрел:",
                value: `<@${reviwerId}> | \`${reviwerTag}\` | ${reviwerId}`,
                inline: false,
            },
        )
        .setColor("Red")
        .setTimestamp();
    if (guildIcon) embed.setThumbnail(guildIcon);
    return [embed];
};

export default {
    customId: MODAL_PREFIX.slice(0, -1),
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { modal: "reject-family-applications" });

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            log.button.info(meta, "Defer updated reply");
        } catch (error) {
            log.button.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "family_applications_reject_modal.execute", interaction.id);
            return;
        }

        try {
            const appId = interaction.customId.replace(MODAL_PREFIX, "").trim();

            if (!appId) {
                log.button.error(meta, `Could not parse application id from customId:${interaction.customId}`);
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Попробуйте через пару секунд")],
                });
                return;
            }

            const reason = interaction.fields.getTextInputValue("reason").trim();
            const cooldownRaw = interaction.fields.getTextInputValue("cooldown").trim();

            let cooldownDays: number;
            if (cooldownRaw === "") {
                cooldownDays = DEFAULT_COOLDOWN_DAYS;
            } else {
                const parsed = Number(cooldownRaw);
                if (!Number.isInteger(parsed) || parsed < 0) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("—・Ошибка")
                                .setDescription("> Кулдаун должен быть целым неотрицательным числом (в днях), либо пустым для значения по умолчанию"),
                        ],
                    });
                    return;
                }
                cooldownDays = parsed;
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
                const reasonBlocked = application.reviewerId
                    ? "Заявка уже взята другим ревьюером"
                    : "У вас нет прав для взаимодействия с этой заявкой";
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription(`> ${reasonBlocked}`)],
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
            const archiveChannelId = config.family_applications.channels.rejected_archive;
            const archiveChannel = await interaction.guild.channels.fetch(archiveChannelId).catch(() => null);

            if (!archiveChannel?.isTextBased()) {
                log.button.error(meta, "rejected_archive channel missing or not text-based");
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
                log.button.error(meta, "Bot lacks permission to post in rejected_archive channel");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Нет прав на отправку в канал архива")],
                });
                return;
            }


            const decisionMadeAt = new Date();
            const cooldownUntil =
                cooldownDays > 0 ? new Date(decisionMadeAt.getTime() + cooldownDays * 24 * 60 * 60 * 1000) : null;

            const [claimed] = await db
                .update(applicationSchema)
                .set({
                    applicationStatus: "REJECTED",
                    decisionMadeById: interaction.user.id,
                    decisionMadeAt,
                    decisionMotivation: reason,
                    coolDownUntil: cooldownUntil,
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


            const reviewer = interaction.member as GuildMember;

            const sideEffects = await Promise.allSettled([

                (async () => {
                    if (!application.threadId) return;
                    const reviewChannel = await interaction.guild!.channels.fetch(application.threadId).catch(() => null);
                    if (!reviewChannel) return;
                    await reviewChannel.delete(`Заявка ${appId} отклонена — ${interaction.user.tag}`);
                })(),
            ]);

            const [threadResult] = sideEffects;
            if (threadResult.status === "rejected") {
                log.button.error(meta, `Could not delete review thread error:${threadResult.reason}`);
            }

            let archiveMessageId: string | null = null;
            try {
                const archiveMessage = await archiveChannel.send({
                    components: rejected_archive_family_applications_embed({
                        applicationId: appId,
                        applicant,
                        fields: application.answers,
                        reviewer,
                        apply_type: applyType,
                        submittedAt: Math.floor(application.createdAt.getTime() / 1000).toString(),
                        rejectedAt: Math.floor(decisionMadeAt.getTime() / 1000).toString(),
                        reason,
                        cooldownUntil: cooldownUntil ? Math.floor(cooldownUntil.getTime() / 1000).toString() : null,
                    }),
                    flags: MessageFlags.IsComponentsV2,
                });
                archiveMessageId = archiveMessage.id;
            } catch (error) {
                log.button.error(meta, `CRITICAL: application ${appId} marked REJECTED but failed to post archive message error:${error}`);
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
                            embeds: RejectedPublicLogEmbed({
                                reviwerId: interaction.user.id,
                                reviwerTag: interaction.user.tag,
                                reason,
                                guildIcon: interaction.guild.iconURL(),
                            }),
                        });
                    } else {
                        log.button.error(meta, "status_log channel missing or not text-based; skipping public log");
                    }
                } catch (error) {
                    log.button.error(meta, `Could not send public reject log error:${error}`);
                }
            }

            log.button.info(meta, `Application ${appId} rejected by ${interaction.user.id} (cooldown: ${cooldownDays}d), archived and removed from incoming`);


            try {
                await interaction.message?.delete();
            } catch (error) {
                log.button.error(meta, `Could not delete incoming application message error:${error}`);
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("—・Готово")
                        .setDescription(`> Заявка отклонена\n> Причина: ${reason}`),
                ],
            });
        } catch (error) {
            log.button.error(meta, "Unhandled error in reject-family-applications modal");
            await safeReply(interaction, error, "family_applications_reject_modal.execute", interaction.id);
        }
    },
} satisfies Modal;