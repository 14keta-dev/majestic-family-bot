import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRowComponentBuilder, MessageFlags, ModalSubmitInteraction } from "discord.js";
import { Modal } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig } from "../../utils/config/store";
import {
    afk_store,
    Already_in_afk_error,
    Invalid_afk_duration,
    parseAfkDurationMinutes,
} from "../../utils/AFK/afk.schema";
import { botAssetEmojis } from "../../utils/emojis/emojis";
import { AFK_MODAL_CUSTOM_ID } from "../../buttons/afk/enter.button";

export const AFK_LOG_BUTTON_CUSTOM_ID = {
    kick: "afk:kick",
} as const;

function errorEmbed(description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`${botAssetEmojis.dot} Ошибка`)
        .setDescription(description)
        .setColor("Red");
}

export default {
    customId: AFK_MODAL_CUSTOM_ID.modal,
    async execute(interaction: ModalSubmitInteraction) {
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { modal: "enter-afk" });

        try {
            log.modal.info(meta, "Enter afk modal submitted");

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const rawDuration = interaction.fields.getTextInputValue(AFK_MODAL_CUSTOM_ID.duration);
            const reason = interaction.fields.getTextInputValue(AFK_MODAL_CUSTOM_ID.reason);

            let durationMinutes: number;
            try {
                durationMinutes = parseAfkDurationMinutes(rawDuration);
            } catch (error) {
                if (error instanceof Invalid_afk_duration) {
                    await interaction.editReply({ embeds: [errorEmbed(`> ${error.message}`)] });
                    return;
                }
                throw error;
            }

            const config = getConfig();

            if (!config.logs.afk_log) {
                log.modal.error(meta, "AFK log channel not configured, cannot enter afk");
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

            const enteredAt = new Date();
            const estimatedEndingAt = new Date(enteredAt.getTime() + durationMinutes * 60_000);

            const logEmbed = new EmbedBuilder()
                .setTitle("> AFK: вход")
                .setDescription(`<@${interaction.user.id}> ушёл в AFK`)
                .addFields(
                    { name: "> На сколько", value: `${botAssetEmojis.dot} ${rawDuration}`, inline: true },
                    { name: "> Окончание", value: `${botAssetEmojis.dot} <t:${Math.floor(estimatedEndingAt.getTime() / 1000)}:R>`, inline: true },
                    { name: "> Причина", value: `${botAssetEmojis.dot} ${reason}`, inline: false },
                )
                .setTimestamp()
                .setColor("Green");

            const kickRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`${AFK_LOG_BUTTON_CUSTOM_ID.kick}:${interaction.user.id}`)
                    .setLabel("Кикнуть из AFK")
                    .setStyle(ButtonStyle.Danger),
            );

            let logMessage;
            try {
                logMessage = await logChannel.send({ embeds: [logEmbed], components: [kickRow] });
            } catch (error) {
                log.modal.error(meta, `Failed to send AFK log message error:${error}`);
                await safeReply(interaction, error, "afk_enter_modal.sendLogMessage", interaction.id);
                return;
            }

            try {
                await afk_store.enter_afk({
                    userId: interaction.user.id,
                    reason,
                    duration: rawDuration,
                    messageId: logMessage.id,
                });
            } catch (error) {
                await logMessage.delete().catch(() => null);

                if (error instanceof Already_in_afk_error) {
                    await interaction.editReply({
                        embeds: [errorEmbed("> Вы уже находитесь в AFK")],
                    });
                    return;
                }
                if (error instanceof Invalid_afk_duration) {
                    await interaction.editReply({ embeds: [errorEmbed(`> ${error.message}`)] });
                    return;
                }
                throw error;
            }

            log.modal.info(meta, "User entered afk");
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${botAssetEmojis.dot} AFK включён`)
                        .addFields(
                            { name: "> На сколько", value: `${botAssetEmojis.dot} ${rawDuration}`, inline: true },
                            { name: "> Окончание", value: `${botAssetEmojis.dot} <t:${Math.floor(estimatedEndingAt.getTime() / 1000)}:R>`, inline: true },
                            { name: "> Причина", value: `${botAssetEmojis.dot} ${reason}`, inline: false },
                        )
                        .setColor("Green"),
                ],
            });
        } catch (error) {
            log.modal.error(meta, `Unhandled error in enter-afk modal error:${error}`);
            await safeReply(interaction, error, "afk_enter_modal.execute", interaction.id);
        }
    },
} satisfies Modal;