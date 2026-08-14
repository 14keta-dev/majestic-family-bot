
import { ActionRowBuilder, ButtonInteraction, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { afk_store } from "../../utils/AFK/afk.schema";
import { botAssetEmojis } from "../../utils/emojis/emojis";
import { AFK_LOG_BUTTON_CUSTOM_ID } from "../../modals/AFK/enter.modal";

export const AFK_KICK_MODAL_CUSTOM_ID = {
    prefix: "modal:afk:kick",
    reason: "afk:kick:reason",
} as const;

function errorEmbed(description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(`${botAssetEmojis.dot} Ошибка`)
        .setDescription(description)
        .setColor("Red");
}

export default {
    customId: AFK_LOG_BUTTON_CUSTOM_ID.kick,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;


        const meta = metaBuilder(interaction.member, { button: "afk-kick" });

        try {
            log.button.info(meta, "Kick afk button triggered");

            const targetUserId = interaction.customId.split(":").pop();
            if (!targetUserId) {
                log.button.error(meta, "Kick button customId missing target user id");
                await interaction.reply({
                    embeds: [errorEmbed("> Не удалось определить пользователя.")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const active = afk_store.get_all_afk().find((entry) => entry.userId === targetUserId);
            if (!active) {
                await interaction.reply({
                    embeds: [errorEmbed("> Этот пользователь уже не находится в AFK.")],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const reasonInput = new TextInputBuilder()
                .setCustomId(AFK_KICK_MODAL_CUSTOM_ID.reason)
                .setLabel("Причина кика")
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(1)
                .setMaxLength(200)
                .setRequired(true);

            const modal = new ModalBuilder()
                .setCustomId(`${AFK_KICK_MODAL_CUSTOM_ID.prefix}:${targetUserId}`)
                .setTitle("Кикнуть из AFK")
                .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));

            await interaction.showModal(modal);
        } catch (error) {
            log.button.error(meta, `Failed to open afk-kick modal error:${error}`);
            await safeReply(interaction, error, "afk_kick_button.execute", interaction.id);
        }
    },
} satisfies Button;