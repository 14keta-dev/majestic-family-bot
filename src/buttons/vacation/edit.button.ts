import { ButtonInteraction, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig } from "../../utils/config/store";
import { are_vacation_channels_configured } from "../../utils/vacation/is_configured";
import { buildEditVacationDraftPreview, initVacationEditDraft } from "../../utils/vacation/draft_store";
import { build_set_up_vacation_embed } from "../../embed/vacation/set_up.embed";
import { MANAGE_VACATION_CUSTOM_IDS } from "../../embed/vacation/manage.embed";

export default {
    customId: MANAGE_VACATION_CUSTOM_IDS.edit,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;


        const meta = metaBuilder(interaction.member, { button: "vacation_edit_settings" });

        try {
            const config = getConfig();

            if (!are_vacation_channels_configured(config.vacation)) {
                log.button.error(meta, "Edit pressed before vacation setup was completed");
                await interaction.followUp({
                    content: "Система отпусков ещё не настроена — сначала пройдите первичную настройку.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const preview = buildEditVacationDraftPreview(config.vacation);

            initVacationEditDraft(interaction.message.id, interaction.user.id, config.vacation);

            await interaction.editReply({
                components: build_set_up_vacation_embed(preview),
                flags: MessageFlags.IsComponentsV2,
            });

            log.button.info(meta, "Opened vacation edit settings panel");
        } catch (error) {
            log.button.error(meta, "Failed to open vacation edit settings panel");
            await safeReply(interaction, error, "vacation_edit_settings.execute", interaction.id);
        }
    },
} satisfies Button;