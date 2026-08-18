import { ButtonInteraction, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig } from "../../utils/config/store";
import { are_backpack_channels_configured } from "../../utils/backpack/is_configured";
import { buildEditBackpackDraftPreview, initBackpackEditDraft } from "../../utils/backpack/draft";
import { build_set_up_backpack_embed } from "../../embed/bacpack/set_up.embed";
import { MANAGE_BACKPACK_CUSTOM_IDS } from "../../embed/bacpack/manage.embed";

export default {
    customId: MANAGE_BACKPACK_CUSTOM_IDS.edit,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        const meta = metaBuilder(interaction.member, { button: "backpack_edit_settings" });

        try {
            const config = getConfig();

            if (!are_backpack_channels_configured(config.backpack)) {
                log.button.error(meta, "Edit pressed before backpack setup was completed");
                await interaction.followUp({
                    content: "Система бэкпаков ещё не настроена — сначала пройдите первичную настройку.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const preview = buildEditBackpackDraftPreview(config.backpack);

            initBackpackEditDraft(interaction.message.id, interaction.user.id, config.backpack);

            await interaction.editReply({
                components: build_set_up_backpack_embed(preview),
                flags: MessageFlags.IsComponentsV2,
            });

            log.button.info(meta, "Opened backpack edit settings panel");
        } catch (error) {
            log.button.error(meta, "Failed to open backpack edit settings panel");
            await safeReply(interaction, error, "backpack_edit_settings.execute", interaction.id);
        }
    },
} satisfies Button;