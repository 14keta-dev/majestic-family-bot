// modals/afk/kick.modal.ts
import { EmbedBuilder, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { afk_store, Not_in_afk_error } from "../../utils/AFK/afk.schema";
import { botAssetsEmojis } from "../../utils/emojis/emojis";
import { getConfig } from "../../utils/config/store";
import { AFK_KICK_MODAL_CUSTOM_ID } from "../../buttons/afk/kick.button";

function errorEmbed(description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`${botAssetsEmojis.dot} Ошибка`)
        .setDescription(description)
        .setColor("Red");
}

/** Formats a minute count as "Xh Ym" / "Xm", dropping the hours part when zero. */
function formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h${minutes}m`;
}

export default {
    customId: AFK_KICK_MODAL_CUSTOM_ID.prefix,
    dynamic: true,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { modal: "afk-kick" });

        try {
            log.modal.info(meta, "Kick afk modal submitted");

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const targetUserId = interaction.customId.split(":").pop();
            const reason = interaction.fields.getTextInputValue(AFK_KICK_MODAL_CUSTOM_ID.reason);

            if (!targetUserId) {
                log.modal.error(meta, "Kick modal customId missing target user id");
                await interaction.editReply({ embeds: [errorEmbed("> Не удалось определить пользователя.")] });
                return;
            }

            const active = afk_store.get_all_afk().find((entry) => entry.userId === targetUserId);
            if (!active) {
                await interaction.editReply({
                    embeds: [errorEmbed("> Этот пользователь уже не находится в AFK.")],
                });
                return;
            }

            const config = getConfig();
            if (!config.logs.afk_log) {
                log.modal.error(meta, "AFK log channel not configured, cannot record kick");
                await interaction.editReply({
                    embeds: [errorEmbed("> Канал логов AFK не настроен. Обратитесь к администратору.")],
                });
                return;
            }

            const logChannel = await interaction.guild.channels.fetch(config.logs.afk_log).catch(() => null);
            if (!logChannel?.isTextBased()) {
                log.modal.error(meta, "AFK log channel is missing or not text based");
                await interaction.editReply({
                    embeds: [errorEmbed("> Канал логов AFK недоступен. Обратитесь к администратору.")],
                });
                return;
            }

            const originalMessage = await logChannel.messages.fetch(active.log_message).catch(() => null);
            if (!originalMessage) {
                log.modal.error(meta, "Original AFK log message not found, cannot reply with kick notice");
                await interaction.editReply({
                    embeds: [errorEmbed("> Исходное сообщение AFK не найдено.")],
                });
                return;
            }

            const enteredAt = new Date(active.enteredAt);
            const kickedAt = new Date();
            const elapsedMinutes = Math.max(0, Math.round((kickedAt.getTime() - enteredAt.getTime()) / 60_000));
            const elapsedFormatted = formatMinutes(elapsedMinutes);

            const kickEmbed = new EmbedBuilder()
                .setTitle("> AFK: кик")
                .setDescription(`<@${targetUserId}> был кикнут из AFK`)
                .addFields(
                    { name: "> Кем", value: `${botAssetsEmojis.dot} <@${interaction.user.id}>`, inline: true },
                    { name: "> Причина кика", value: `${botAssetsEmojis.dot} ${reason}`, inline: true },
                    { name: "> Пробыл в AFK", value: `${botAssetsEmojis.dot} ${elapsedFormatted}`, inline: true },
                    { name: "> Ушёл в AFK", value: `${botAssetsEmojis.dot} <t:${Math.floor(enteredAt.getTime() / 1000)}:R>`, inline: true },
                    { name: "> Ожидаемое возвращение", value: `${botAssetsEmojis.dot} <t:${Math.floor(new Date(active.estimatedEndingAt).getTime() / 1000)}:R>`, inline: true },
                    { name: "> Изначальная причина", value: `${botAssetsEmojis.dot} ${active.afk_reason}`, inline: false },
                )
                .setColor("Red")
                .setTimestamp();

            let replyMessage;
            try {
                replyMessage = await originalMessage.reply({ embeds: [kickEmbed] });
            } catch (error) {
                log.modal.error(meta, `Failed to send kick reply message error:${error}`);
                await safeReply(interaction, error, "afk_kick_modal.sendReplyMessage", interaction.id);
                return;
            }

            let kicked;
            try {
                kicked = await afk_store.kick(targetUserId, interaction.user.id, reason, replyMessage.id);
            } catch (error) {
                await replyMessage.delete().catch(() => null);

                if (error instanceof Not_in_afk_error) {
                    await interaction.editReply({
                        embeds: [errorEmbed("> Этот пользователь уже не находится в AFK.")],
                    });
                    return;
                }
                throw error;
            }

            try {
                const originalEmbed = originalMessage.embeds[0];
                const updatedEmbed = originalEmbed
                    ? EmbedBuilder.from(originalEmbed)
                    : new EmbedBuilder().setTitle("> AFK");

                await originalMessage.edit({ embeds: [updatedEmbed], components: [] }).catch(() => null);
            } catch (error) {
                log.modal.error(meta, `Failed to update original AFK log message after kick error:${error}`);
            }

            log.modal.info(meta, `Kicked user ${targetUserId} from afk after ${elapsedFormatted}`);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${botAssetsEmojis.dot} Пользователь кикнут из AFK`)
                        .setDescription(`<@${targetUserId}> был кикнут из AFK`)
                        .addFields(
                            { name: "> Причина кика", value: `${botAssetsEmojis.dot} ${reason}`, inline: true },
                            { name: "> Пробыл в AFK", value: `${botAssetsEmojis.dot} ${elapsedFormatted}`, inline: true },
                        )
                        .setColor("Green"),
                ],
            });
        } catch (error) {
            log.modal.error(meta, `Unhandled error in afk-kick modal error:${error}`);
            await safeReply(interaction, error, "afk_kick_modal.execute", interaction.id);
        }
    },
} satisfies Modal;