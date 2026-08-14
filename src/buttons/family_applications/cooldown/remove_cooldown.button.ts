
import { ButtonInteraction, MessageFlags } from "discord.js";
import { REMOVE_COOLDOWN_EMBED_CUSTOM_IDS, manage_cooldown_family_applications } from "../../../embed/family_applications/cooldown.embed";
import { Button } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { db } from "../../../utils/db";
import { applicationSchema } from "../../../utils/db/schema";
import { eq } from "drizzle-orm";
import { getConfig } from "../../../utils/config/store";
import { getApplyType } from "../../../utils/config/family_applications/applyFieldPresets";
import { rejected_archive_family_applications_embed } from "../../../embed/family_applications/review/rejected_archive.embed";
import { getActiveCooldownApplications } from "../../../utils/family_applications/active_cooldown";


export default {
    customId: REMOVE_COOLDOWN_EMBED_CUSTOM_IDS.remove,
    dynamic: true,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.guild || !interaction.member) return;
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { button: "family_applications_remove_cooldown" });

        const idParts = interaction.customId.split(":");
        const applicationId = idParts.pop();
        const pageRaw = idParts.pop();
        const page = pageRaw ? parseInt(pageRaw, 10) : NaN;

        if (!applicationId || pageRaw === undefined || Number.isNaN(page) || page < 0) {
            log.button.error(meta, "Missing or invalid page/applicationId in customId");
            await safeReply(
                interaction,
                new Error(`Malformed customId: ${interaction.customId}`),
                "family_applications_remove_cooldown.parseCustomId",
                interaction.id,
            );
            return;
        }

        try {
        
            const [existing] = await db
                .select({ coolDownUntil: applicationSchema.coolDownUntil })
                .from(applicationSchema)
                .where(eq(applicationSchema.id, applicationId));

            const originalCooldownUntil = existing?.coolDownUntil ?? null;

            const [application] = await db
                .update(applicationSchema)
                .set({ coolDownUntil: null, updatedAt: new Date() })
                .where(eq(applicationSchema.id, applicationId))
                .returning();

            if (!application) {
                log.button.warn(meta, "Application not found for cooldown removal");
               
                try {
                    const applications = await getActiveCooldownApplications();
                    const familyConfig = getConfig().family_applications;
                    const components = manage_cooldown_family_applications({
                        applications,
                        guildId: interaction.guildId,
                        archiveChannelId: familyConfig.channels.rejected_archive,
                        page,
                    });
                    await interaction.editReply({ components, flags: MessageFlags.IsComponentsV2 });
                } catch (renderError) {
                    log.button.error(meta, "Failed to recover UI after missing application", renderError);
                }
                return;
            }

            const familyConfig = getConfig().family_applications;

      
            if (application.archiveMessageId) {
                try {
                    const archiveChannel = await interaction.guild.channels.fetch(familyConfig.channels.rejected_archive);

                    if (archiveChannel?.isTextBased()) {
                        const archiveMessage = await archiveChannel.messages.fetch(application.archiveMessageId);

                        const [applicant, reviewer] = await Promise.all([
                            interaction.guild.members.fetch(application.applicantId).catch(() => null),
                            application.decisionMadeById
                                ? interaction.guild.members.fetch(application.decisionMadeById).catch(() => null)
                                : null,
                        ]);

                        const applyType = getApplyType(application.applicationType);

                        if (archiveMessage && applicant && reviewer && applyType) {
                            const components = rejected_archive_family_applications_embed({
                                applicationId: application.id,
                                applicant,
                                fields: application.answers,
                                reviewer,
                                apply_type: applyType,
                                submittedAt: String(Math.floor(application.createdAt.getTime() / 1000)),
                                rejectedAt: String(
                                    Math.floor((application.decisionMadeAt ?? application.updatedAt).getTime() / 1000),
                                ),
                                reason: application.decisionMotivation ?? "—",
                                cooldownUntil: originalCooldownUntil
                                    ? String(Math.floor(originalCooldownUntil.getTime() / 1000))
                                    : null,
                                cooldownRemovedBy: interaction.member,
                                cooldownRemovedAt: String(Math.floor(Date.now() / 1000)),
                            });

                            await archiveMessage.edit({ components, flags: MessageFlags.IsComponentsV2 });
                        } else {
                            log.button.warn(meta, "Could not resolve applicant/reviewer/applyType for archive edit");
                        }
                    }
                } catch (archiveError) {
                 
                    log.button.error(meta, "Failed to edit rejected archive message", archiveError);
                }
            }

    
            const applications = await getActiveCooldownApplications();

            const components = manage_cooldown_family_applications({
                applications,
                guildId: interaction.guildId,
                archiveChannelId: familyConfig.channels.rejected_archive,
                page,
            });

            await interaction.editReply({ components, flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            log.button.error(meta, "Failed to remove cooldown");
            await safeReply(interaction, error, "family_applications_remove_cooldown.update", interaction.id);
        }
    }
} satisfies Button;