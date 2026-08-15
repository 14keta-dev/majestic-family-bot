import { ActionRowBuilder, ButtonInteraction, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { AFK_EMBED_BUTTON_CUSTOM_IDS } from "../../embed/AFK/afk.embed";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { afk_store } from "../../utils/AFK/afk.schema";
import { botAssetsEmojis } from "../../utils/emojis/emojis";

export const AFK_MODAL_CUSTOM_ID = {
    modal: "modal:afk:enter",
    duration: "afk:duration",
    reason: "afk:reason",
} as const;

export default {
    customId: AFK_EMBED_BUTTON_CUSTOM_IDS.enter,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { button: "enter-afk" });

        try {
            log.button.info(meta, "Enter afk button triggered");

            const active = afk_store
                .get_all_afk()
                .find((entry) => entry.userId === interaction.user.id);

            if (active) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`${botAssetsEmojis.dot} Ошибка`)
                            .setDescription("> Вы уже находитесь в AFK")
                            .setColor("Red"),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const durationInput = new TextInputBuilder()
                .setCustomId(AFK_MODAL_CUSTOM_ID.duration)
                .setLabel("Длительность (например 30m, 1h, 1h30m)")
                .setPlaceholder("30m — 24h")
                .setStyle(TextInputStyle.Short)
                .setMinLength(2)
                .setMaxLength(10)
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId(AFK_MODAL_CUSTOM_ID.reason)
                .setLabel("Причина")
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(1)
                .setMaxLength(200)
                .setRequired(true);

            const modal = new ModalBuilder()
                .setCustomId(AFK_MODAL_CUSTOM_ID.modal)
                .setTitle("Уйти в AFK")
                .addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
                );

            await interaction.showModal(modal);
        } catch (error) {
            log.button.error(meta, `Failed to open enter-afk modal error:${error}`);
            await safeReply(interaction, error, "afk_enter_button.execute", interaction.id);
        }
    },
} satisfies Button;