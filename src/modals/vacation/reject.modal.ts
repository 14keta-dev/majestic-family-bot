
import { ModalSubmitInteraction, MessageFlags, GuildMember, EmbedBuilder } from "discord.js";
import { VACATION_REJECT_MODAL_CUSTOM_ID } from "../../utils/vacation/reject_vacation.helper";
import { vacation_embeds, VacationSummary } from "../../embed/vacation/vacation_interaction.embed";
import {
    acquireVacationEntryLock,
    formatVacationDuration,
    releaseVacationEntryLock,
    Vacation_entry_locked_error,
    vacation_store,
} from "../../utils/vacation/vacation.schema";
import { getConfig } from "../../utils/config/store";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { respond } from "../../utils/vacation/respond.helper";

export default {
    customId: VACATION_REJECT_MODAL_CUSTOM_ID.modal,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) return;

        const entryId = interaction.customId.slice(VACATION_REJECT_MODAL_CUSTOM_ID.modal.length + 1);
        const meta = metaBuilder(interaction.member, { modal: "vacation_request_reject_modal" });

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

            const rejectReason = interaction.fields
                .getTextInputValue(VACATION_REJECT_MODAL_CUSTOM_ID.reason)
                .trim();

            const updated = await vacation_store.update_vacation(entryId, {
                status: "REJECTED",
                reject_reason: rejectReason,
                reviewerId: interaction.user.id,
            });
            if (!updated) {
                await respond(interaction, { content: "Не удалось обновить заявку." });
                return;
            }

            log.modal.info(meta, `Vacation request ${entryId} rejected by ${interaction.user.id}`);

            const summary: VacationSummary = {
                userId: updated.userId,
                reason: updated.reason,
                durationText: formatVacationDuration(updated.estimated_end),
                removedRoleCount: 0,
                reviewerId: interaction.user.id,
                rejectReason,
            };

            await postRejectionToLog(interaction, meta, summary);
            await deleteIncomingRequestMessage(interaction, meta, updated.log_message);
            await send_user_dm(interaction.member, rejectReason, interaction.user.id, meta);

            await respond(interaction, {
                content: `Заявка на отпуск <@${updated.userId}> отклонена.`,
            });
        } catch (error) {
            log.modal.error(meta, "Failed to reject vacation request", error);
            await safeReply(interaction, error, "vacation_request_reject_modal.execute", interaction.id);
        } finally {
            releaseVacationEntryLock(entryId);
        }
    },
};

async function postRejectionToLog(
    interaction: ModalSubmitInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
    summary: VacationSummary,
): Promise<void> {
    const logChannelId = getConfig().logs?.vacation_log;
    if (!logChannelId) return;

    try {
        const logChannel = await interaction.guild.channels.fetch(logChannelId);
        if (!logChannel?.isTextBased()) {
            log.modal.error(meta, "Vacation log channel is not text based");
            return;
        }
        await logChannel.send({ embeds: [vacation_embeds.rejected(summary)] });
    } catch (error) {
        log.modal.error(meta, "Failed to send rejected vacation to log channel", error);
    }
}

async function deleteIncomingRequestMessage(
    interaction: ModalSubmitInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
    messageId: string | null,
): Promise<void> {
    const incomingChannelId = getConfig().vacation.incoming_request;
    if (!incomingChannelId || !messageId) return;

    try {
        const channel = await interaction.guild.channels.fetch(incomingChannelId);
        if (channel?.isTextBased()) {
            await channel.messages.delete(messageId);
        }
    } catch (error) {
        log.modal.error(meta, "Failed to delete vacation request message from incoming channel", error);
    }
}

async function send_user_dm(
    member: GuildMember,
    reason: string,
    reviewerId: string,
    meta: ReturnType<typeof metaBuilder>,
) {
    if (!member || !reason) {
        throw new Error("No guild member or reason provied");
    }

    try {
        const embed = new EmbedBuilder()
            .setDescription(`> Ваш запрос на отпуск был отклонён <@${reviewerId}> по причине ${reason}`);

        await member.send({ embeds: [embed] });
    } catch (error) {
        log.modal.error(meta, "Failed to send user dm with notification", error);
    }
}