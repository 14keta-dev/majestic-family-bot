import { ButtonInteraction, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { getConfig } from "../../utils/config/store";
import { are_afk_channels_configured } from "../../utils/AFK/is_configured";
import {
    AFK_config_draft,
    buildEditAfkDraftPreview,
    initAfkEditDraft,
} from "../../utils/AFK/draft_afk_store";
import { build_set_up_afk_embed } from "../../embed/AFK/set_up.embed";
import { MANAGE_AFK_CUSTOM_IDS } from "../../embed/AFK/manage.embed";

export default {
    customId: MANAGE_AFK_CUSTOM_IDS.edit,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "afk_edit_settings" });

        try {
            const config = getConfig();

            if (!are_afk_channels_configured(config.AFK, config.logs)) {
                log.button.error(meta, "Edit pressed before AFK setup was completed");
                await interaction.followUp({
                    content: "AFK система ещё не настроена — сначала пройдите первичную настройку.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const currentAfkState: AFK_config_draft = {
                panel_channel: config.AFK.panel_channel,
                afk_log: config.logs.afk_log,
            };

            const preview = buildEditAfkDraftPreview(currentAfkState);


            initAfkEditDraft(interaction.message.id, interaction.user.id, currentAfkState);

            await interaction.editReply({
                components: build_set_up_afk_embed(preview),
                flags: MessageFlags.IsComponentsV2,
            });

            log.button.info(meta, "Opened AFK edit settings panel");
        } catch (error) {
            log.button.error(meta, "Failed to open AFK edit settings panel");
            await safeReply(interaction, error, "afk_edit_settings.execute", interaction.id);
        }
    },
} satisfies Button;