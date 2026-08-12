import { ButtonInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import { and, eq, inArray, desc } from "drizzle-orm";
import { INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID } from "../../../../embed/family_applications/review/incoming.embed";
import { Button } from "../../../../types";
import { metaBuilder } from "../../../../utils/logger/met_builder";
import { log } from "../../../../utils/logger";
import { safeReply } from "../../../../utils/safeReply.helper";
import { db } from "../../../../utils/db";
import { applicationSchema } from "../../../../utils/db/schema";
import { getApplyType } from "../../../../utils/config/family_applications/applyFieldPresets";
import can_review_application from "../../../../utils/family_applications/can_review.helper";
import { getConfig } from "../../../../utils/config/store";
import { botAssetEmojis } from "../../../../utils/emojis/emojis";

const STATUS_LABEL: Record<string, string> = {
    ACCEPTED: `${botAssetEmojis.active} Принята`,
    REJECTED: `${botAssetEmojis.closed} Отклонена`,
};

export default {
    customId: INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.previuse_applications,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.member || !interaction.guild) return;

        const meta = metaBuilder(interaction.member as GuildMember, { button: "previuse-family-applications" });

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (error) {
            log.button.error(meta, "Could not defer reply in time");
            await safeReply(interaction, error, "family_applications_previuse.execute", interaction.id);
            return;
        }

        try {
            const appId = interaction.customId
                .replace(`${INCOMING_FAMILY_APPLICATIONS_CUSTOM_ID.previuse_applications}:`, "")
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
                log.button.error(meta, "Could not fetch application with application ID");
                await interaction.editReply({
                    embeds: [new EmbedBuilder().setTitle("—・Ошибка").setDescription("> Попробуйте через пару секунд")],
                });
                return;
            }

            const can_manage = await can_review_application({
                member: interaction.member as GuildMember,
                application_kind: application.applicationType,
                takenByUserId: application.reviewerId ?? undefined,
            });

            if (!can_manage) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("—・Ошибка")
                            .setDescription("> У вас нет прав для просмотра истории по этой заявке"),
                    ],
                });
                return;
            }

            const previuse_applications = await db
                .select()
                .from(applicationSchema)
                .where(
                    and(
                        eq(applicationSchema.applicantId, application.applicantId),
                        inArray(applicationSchema.applicationStatus, ["ACCEPTED", "REJECTED"]),
                    ),
                )
                .orderBy(desc(applicationSchema.decisionMadeAt));

            if (previuse_applications.length === 0) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("—・История заявок")
                            .setDescription("> Предыдущих заявок не найдено"),
                    ],
                });
                return;
            }

            const config = getConfig();

            const lines = previuse_applications.map((app) => {
                const type = getApplyType(app.applicationType);
                const typeName = type?.name ?? app.applicationType;
                const statusLabel = STATUS_LABEL[app.applicationStatus] ?? app.applicationStatus;
                const when = app.decisionMadeAt
                    ? `<t:${Math.floor(app.decisionMadeAt.getTime() / 1000)}:R>`
                    : `<t:${Math.floor(app.createdAt.getTime() / 1000)}:R>`;

                let link = "";
                if (app.archiveMessageId) {
                    const archiveChannelId =
                        app.applicationStatus === "ACCEPTED"
                            ? config.family_applications.channels.accepted_archive
                            : config.family_applications.channels.rejected_archive;

                    if (archiveChannelId) {
                        link = `[Открыть](https://discord.com/channels/${interaction.guild!.id}/${archiveChannelId}/${app.archiveMessageId})`;
                    }
                }

                const parts = [`**${typeName}** — ${statusLabel} — ${when}`];
                if (link) parts.push(link);

                return parts.join("\n");
            });

            const acceptedCount = previuse_applications.filter((a) => a.applicationStatus === "ACCEPTED").length;
            const rejectedCount = previuse_applications.filter((a) => a.applicationStatus === "REJECTED").length;

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("—・История заявок")
                        .setDescription(
                            `Всего предыдущих заявок: **${previuse_applications.length}** (принято: ${acceptedCount}, отклонено: ${rejectedCount})\n\n${lines.join("\n\n")}`,
                        )
                        .setColor("Grey"),
                ],
            });

            log.button.info(meta, `Displayed ${previuse_applications.length} previous applications for ${application.applicantId}`);
        } catch (error) {
            log.button.error(meta, "Failed to process previuse applications action");
            await safeReply(interaction, error, "family_applications_previuse.execute", interaction.id);
        }
    },
} satisfies Button;