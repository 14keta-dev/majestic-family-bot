import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { VACATION_REVIEW_CUSTOM_IDS } from "../../embed/vacation/vacation.components";
import { build_kick_vacation_modal } from "../../utils/vacation/kick_vacation.helper";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { vacation_store } from "../../utils/vacation/vacation.schema";

const EMBED_COLOR = 0xE86C6C;

export default {
    customId: VACATION_REVIEW_CUSTOM_IDS.kick,
    dynamic: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        const entryId = interaction.customId.slice(VACATION_REVIEW_CUSTOM_IDS.kick.length + 1);
        const meta = metaBuilder(interaction.member, { button: "vacation_request_kick" });

        try {
            const entry = vacation_store.get(entryId);

            if (!entry || entry.status === "REJECTED" || entry.endedAt !== null) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(EMBED_COLOR)
                            .setDescription("Этот отпуск уже завершён или заявка не найдена."),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.showModal(build_kick_vacation_modal(entryId));
        } catch (error) {
            log.button.error(meta, "Failed to open vacation kick modal");
            await safeReply(interaction, error, "vacation_request_kick.execute", interaction.id);
        }
    },
} satisfies Button;