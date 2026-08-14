import { ButtonInteraction, MessageFlags } from "discord.js";
import { VACATION_REVIEW_CUSTOM_IDS, vacation_components } from "../../embed/vacation/vacation.components";
import { vacation_embeds, VacationSummary } from "../../embed/vacation/vacation_interaction.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig } from "../../utils/config/store";
import {
    acquireVacationEntryLock,
    formatVacationDuration,
    releaseVacationEntryLock,
    Vacation_entry_locked_error,
    vacation_store,
} from "../../utils/vacation/vacation.schema";
import { respond } from "../../utils/vacation/respond.helper";
import { vacation_role_service } from "../../utils/vacation/remove_roles";
import { VacationRoleError } from "../../utils/vacation/errors";

export default {
    customId: VACATION_REVIEW_CUSTOM_IDS.accept,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        const entryId = interaction.customId.slice(VACATION_REVIEW_CUSTOM_IDS.accept.length + 1);
        const meta = metaBuilder(interaction.member, { button: "vacation_request_accept" });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            acquireVacationEntryLock(entryId);
        } catch (error) {
            if (error instanceof Vacation_entry_locked_error) {
                await respond(interaction, { content: error.message });
                return;
            }
            throw error;
        }

        try {
            const entry = vacation_store.get(entryId);
            if (!entry) {
                await respond(interaction, {
                    content: "Заявка не найдена — возможно, она уже была обработана.",
                });
                return;
            }
            if (entry.status !== null) {
                await respond(interaction, { content: "Эта заявка уже была рассмотрена." });
                return;
            }

            const config = getConfig();
            const vacationRoleId = config.vacation.vacation_role;
            if (!vacationRoleId) {
                await respond(interaction, {
                    embeds: [vacation_embeds.error("Роль отпуска не настроена. Обратитесь к администратору.")],
                });
                return;
            }

            const applicant = await interaction.guild.members
                .fetch(entry.userId)
                .catch(() => null);

            let removedRoleIds: string[] = [];
            if (applicant) {
                try {
                    removedRoleIds = await vacation_role_service.apply(applicant, entry.id, vacationRoleId);
                } catch (error) {
                    log.button.error(meta, "Failed to apply vacation roles on accept", error);
                    const message =
                        error instanceof VacationRoleError
                            ? error.message
                            : "Не удалось снять роли. Попробуйте ещё раз через пару секунд.";
                    await respond(interaction, { embeds: [vacation_embeds.error(message)] });
                    return;
                }
            } else {
                log.button.warn(meta, `Applicant ${entry.userId} not found in guild — approving without role changes`);
            }

            const updated = await vacation_store.update_vacation(entryId, {
                status: "APPROVED",
                reviewerId: interaction.user.id,
                roles_romeved: removedRoleIds,
            });
            if (!updated) {
                if (applicant && removedRoleIds.length > 0) {
                    await vacation_role_service.restore(applicant, removedRoleIds, vacationRoleId, entryId).catch(() => { });
                }
                await respond(interaction, { content: "Не удалось обновить заявку." });
                return;
            }

            log.button.info(meta, `Vacation request ${entryId} accepted by ${interaction.user.id}`);

            const summary: VacationSummary = {
                userId: updated.userId,
                reason: updated.reason,
                durationText: formatVacationDuration(updated.estimated_end),
                removedRoleCount: removedRoleIds.length,
                reviewerId: interaction.user.id,
            };

            await postToVacationLog(interaction, meta, entryId, summary);

            await interaction.message.delete().catch((error) => {
                log.button.error(meta, "Failed to delete vacation request message from incoming channel", error);
            });

            await respond(interaction, {
                content: `Заявка на отпуск <@${updated.userId}> принята.`,
            });
        } catch (error) {
            log.button.error(meta, "Failed to accept vacation request", error);
            await safeReply(interaction, error, "vacation_request_accept.execute", interaction.id);
        } finally {
            releaseVacationEntryLock(entryId);
        }
    },
} satisfies Button;

async function postToVacationLog(
    interaction: ButtonInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
    entryId: string,
    summary: VacationSummary,
): Promise<void> {
    const logChannelId = getConfig().logs?.vacation_log;
    if (!logChannelId) {
        log.button.error(meta, "No vacation log channel configured — approved entry was not logged");
        return;
    }

    try {
        const logChannel = await interaction.guild.channels.fetch(logChannelId);
        if (!logChannel?.isTextBased()) {
            log.button.error(meta, "Vacation log channel is not text based");
            return;
        }

        const logMessage = await logChannel.send({
            embeds: [vacation_embeds.approved(summary)],
            components: [vacation_components.kickRow(entryId)],
        });

        await vacation_store.update_vacation(entryId, { log_message: logMessage.id });
    } catch (error) {
        log.button.error(meta, "Failed to send approved vacation to log channel", error);
    }
}