
import { EmbedBuilder, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { VACATION_KICK_MODAL_CUSTOM_ID } from "../../utils/vacation/kick_vacation.helper";
import {
    acquireVacationEntryLock,
    releaseVacationEntryLock,
    Vacation_entry_locked_error,
    vacation_store,
} from "../../utils/vacation/vacation.schema";
import { getConfig } from "../../utils/config/store";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { respond } from "../../utils/vacation/respond.helper";
import { vacation_role_service } from "../../utils/vacation/remove_roles";
import { vacation_embeds } from "../../embed/vacation/vacation_interaction.embed";
import { Modal } from "../../types";

const EMBED_COLOR = 0x282828;
const SUCCESS_COLOR = 0x57C77A;
const WARNING_COLOR = 0xF2B84B;

export default {
    customId: VACATION_KICK_MODAL_CUSTOM_ID.modal,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) return;

        const entryId = interaction.customId.slice(VACATION_KICK_MODAL_CUSTOM_ID.modal.length + 1);
        const meta = metaBuilder(interaction.member, { modal: "vacation_request_kick_modal" });

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
            if (!entry || entry.status === "REJECTED" || entry.endedAt !== null) {
                await respond(interaction, {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(EMBED_COLOR)
                            .setDescription("Этот отпуск уже завершён или заявка не найдена."),
                    ],
                });
                return;
            }

            const reason = interaction.fields.getTextInputValue(VACATION_KICK_MODAL_CUSTOM_ID.reason).trim();

            const vacationRoleId = getConfig().vacation.vacation_role;
            if (!vacationRoleId) {
                await respond(interaction, {
                    embeds: [vacation_embeds.error("Роль отпуска не настроена. Обратитесь к администратору.")],
                });
                return;
            }

            const member = await interaction.guild.members.fetch(entry.userId).catch(() => null);

            let rolesRestored = true;
            if (member) {
                rolesRestored = await vacation_role_service.restore(member, entry.roles_romeved, vacationRoleId, entry.id);
            } else {
                log.modal.warn(meta, `Member ${entry.userId} not found in guild — ending vacation without role changes`);
            }

            const updated = await vacation_store.update_vacation(entryId, {
                endedAt: new Date().toISOString(),
                reviewerId: interaction.user.id,
                reject_reason: reason,
            });
            if (!updated) {
                await respond(interaction, {
                    embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription("Не удалось обновить заявку.")],
                });
                return;
            }

            const durationFormatted = formatDuration(entry.startedAt, updated.endedAt!);

            log.modal.info(
                meta,
                `Vacation ${entryId} ended early by ${interaction.user.id} (${member ? (rolesRestored ? "roles restored" : "role restore FAILED") : "member gone"})`,
            );

            await replyToLogMessage(interaction, meta, updated.log_message, {
                userId: updated.userId,
                reviewerId: interaction.user.id,
                reason,
                durationFormatted,
            });
            await notifyMember(interaction, member?.id ?? updated.userId, reason, interaction.user.id, meta);

            if (member && !rolesRestored) {
                await respond(interaction, {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(WARNING_COLOR)
                            .setDescription(
                                `⚠️ Отпуск <@${updated.userId}> завершён, но восстановить роли не удалось. Проверьте вручную.`,
                            ),
                    ],
                });
                return;
            }

            await respond(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setColor(SUCCESS_COLOR)
                        .setDescription(`✅ Отпуск <@${updated.userId}> завершён, роли восстановлены.`),
                ],
            });
        } catch (error) {
            log.modal.error(meta, "Failed to end vacation via kick", error);
            await safeReply(interaction, error, "vacation_request_kick_modal.execute", interaction.id);
        } finally {
            releaseVacationEntryLock(entryId);
        }
    },
} satisfies Modal;

function formatDuration(startIso: string, endIso: string): string {
    const totalMinutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(" ");
}

async function replyToLogMessage(
    interaction: ModalSubmitInteraction<"cached">,
    meta: ReturnType<typeof metaBuilder>,
    logMessageId: string | null,
    info: { userId: string; reviewerId: string; reason: string; durationFormatted: string },
): Promise<void> {
    const logChannelId = getConfig().logs?.vacation_log;
    if (!logChannelId || !logMessageId) return;

    try {
        const channel = await interaction.guild.channels.fetch(logChannelId);
        if (!channel?.isTextBased()) return;

        const message = await channel.messages.fetch(logMessageId).catch(() => null);
        if (!message) return;

        const kickEmbed = new EmbedBuilder()
            .setTitle("Отпуск завершён досрочно")
            .setDescription(`<@${info.userId}> был выгнан из отпуска`)
            .addFields(
                { name: "Кем", value: `<@${info.reviewerId}>`, inline: true },
                { name: "Причина", value: info.reason, inline: true },
                { name: "Пробыл в отпуске", value: info.durationFormatted, inline: true },
            )
            .setColor(EMBED_COLOR)
            .setTimestamp();

        await message.reply({ embeds: [kickEmbed] }).catch((error) => {
            log.modal.error(meta, "Failed to reply to vacation log message", error);
        });

        await message.edit({ components: [] }).catch(() => null);
    } catch (error) {
        log.modal.error(meta, "Failed to reply/clear buttons on vacation log message", error);
    }
}

async function notifyMember(
    interaction: ModalSubmitInteraction<"cached">,
    userId: string,
    reason: string,
    reviewerId: string,
    meta: ReturnType<typeof metaBuilder>,
): Promise<void> {
    try {
        const user = await interaction.client.users.fetch(userId);
        const embed = new EmbedBuilder().setDescription(
            `> Ваш отпуск был завершён досрочно модератором <@${reviewerId}> по причине: ${reason}`,
        );
        await user.send({ embeds: [embed] });
    } catch (error) {
        log.modal.error(meta, "Failed to send user dm about early vacation end", error);
    }
}