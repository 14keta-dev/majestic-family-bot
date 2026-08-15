
import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { AFK_EMBED_BUTTON_CUSTOM_IDS } from "../../embed/AFK/afk.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { afk_store, Not_in_afk_error } from "../../utils/AFK/afk.schema";
import { botAssetsEmojis } from "../../utils/emojis/emojis";
import { getConfig } from "../../utils/config/store";

function errorEmbed(description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`${botAssetsEmojis.dot} Ошибка`)
        .setDescription(description)
        .setColor("Red");
}

/** Formats a minute count as "Xh Ym" / "Xh" / "Ym". */
function formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h${minutes}m`;
}

export default {
    customId: AFK_EMBED_BUTTON_CUSTOM_IDS.leave,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { button: "leave-afk" });

        try {
            log.button.info(meta, "Leave afk button triggered");

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const active = afk_store.get_all_afk().find((entry) => entry.userId === interaction.user.id);
            if (!active) {
                await interaction.editReply({
                    embeds: [errorEmbed("> Вы не находитесь в AFK.")],
                });
                return;
            }

            const config = getConfig();
            const enteredAt = new Date(active.enteredAt);
            const leftAt = new Date();
            const elapsedMinutes = Math.max(0, Math.round((leftAt.getTime() - enteredAt.getTime()) / 60_000));
            const elapsedFormatted = formatMinutes(elapsedMinutes);

            let replyMessageId: string | undefined;

            if (config.logs.afk_log) {
                const logChannel = await interaction.guild.channels.fetch(config.logs.afk_log).catch(() => null);
                if (logChannel?.isTextBased()) {
                    const originalMessage = await logChannel.messages.fetch(active.log_message).catch(() => null);
                    if (originalMessage) {
                        const leaveEmbed = new EmbedBuilder()
                            .setTitle("> AFK: выход")
                            .setDescription(`<@${interaction.user.id}> вернулся из AFK`)
                            .addFields(
                                { name: "> Пробыл в AFK", value: `${botAssetsEmojis.dot} ${elapsedFormatted}`, inline: true },
                                { name: "> Ушёл в AFK", value: `${botAssetsEmojis.dot} <t:${Math.floor(enteredAt.getTime() / 1000)}:R>`, inline: true },
                                { name: "> Причина", value: `${botAssetsEmojis.dot} ${active.afk_reason}`, inline: false },
                            )
                            .setColor("Green")
                            .setTimestamp();

                        const replyMessage = await originalMessage.reply({ embeds: [leaveEmbed] }).catch((error) => {
                            log.button.error(meta, `Failed to send leave reply message error:${error}`);
                            return null;
                        });

                        if (replyMessage) {
                            replyMessageId = replyMessage.id;

                            const originalEmbed = originalMessage.embeds[0];
                            const updatedEmbed = originalEmbed
                                ? EmbedBuilder.from(originalEmbed)
                                : new EmbedBuilder().setTitle("> AFK");

                            updatedEmbed.setColor("Green");

                            await originalMessage.edit({ embeds: [updatedEmbed], components: [] }).catch(() => null);
                        }
                    }
                }
            }

            try {
                await afk_store.leave(interaction.user.id, replyMessageId ?? active.log_message);
            } catch (error) {
                if (error instanceof Not_in_afk_error) {
                    await interaction.editReply({
                        embeds: [errorEmbed("> Вы не находитесь в AFK.")],
                    });
                    return;
                }
                throw error;
            }

            log.button.info(meta, `User left afk after ${elapsedFormatted}`);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${botAssetsEmojis.dot} Вы вышли из AFK`)
                        .addFields({ name: "> Пробыли в AFK", value: `${botAssetsEmojis.dot} ${elapsedFormatted}` })
                        .setColor("Green"),
                ],
            });
        } catch (error) {
            log.button.error(meta, `Failed to process leave-afk error:${error}`);
            await safeReply(interaction, error, "afk_leave_button.execute", interaction.id);
        }
    },
} satisfies Button;