
import { ButtonInteraction, MessageFlags } from "discord.js";
import { Button } from "../../../types";
import { metaBuilder } from "../../../utils/logger/met_builder";
import { log } from "../../../utils/logger";
import { safeReply } from "../../../utils/safeReply.helper";
import { requireManageGuild } from "../../../utils/permissions/requireManageGuild";
import { getConfig } from "../../../utils/config/store";
import { are_family_application_channels_configured } from "../../../utils/family_applications/isConfigured";
import { buildEditDraftPreview, initEditDraft } from "../../../utils/family_applications/setupDraftStore";
import { build_set_up_family_applications_embed } from "../../../embed/family_applications/set_up.embed";
import { MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS } from "../../../embed/family_applications/manage.embed";

export default {
    customId: MANAGE_FAMILY_APPLICATIONS_CUSTOM_IDS.edit,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "family_applications_edit_settings" });

        try {
            const config = getConfig();

            if (!are_family_application_channels_configured(config.family_applications)) {
                log.button.error(meta, "Edit pressed before initial setup was completed");
                await interaction.followUp({
                    content: "Система заявок ещё не настроена — сначала пройдите первичную настройку.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }


            const preview = buildEditDraftPreview(config.family_applications);

            await interaction.editReply({
                components: build_set_up_family_applications_embed(preview),
                flags: MessageFlags.IsComponentsV2,
            });


            initEditDraft(interaction.message.id, interaction.user.id, config.family_applications);

            log.button.info(meta, "Opened family applications edit settings panel");
        } catch (error) {
            log.button.error(meta, "Failed to open family applications edit settings panel");
            await safeReply(interaction, error, "family_applications_edit_settings.execute", interaction.id);
        }
    },
} satisfies Button;