import { ButtonInteraction, MessageFlags } from "discord.js";
import { MANAGE_MENU_CUSTOM_ID } from "../../embed/commands/menu.embed";
import { Button } from "../../types";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig } from "../../utils/config/store";
import { are_afk_channels_configured } from "../../utils/AFK/is_configured";
import { initAfkDraft } from "../../utils/AFK/draft_afk_store";
import { build_set_up_afk_embed } from "../../embed/AFK/set_up.embed";
import { manage_afk_embed } from "../../embed/AFK/manage.embed";

export default {
    customId: MANAGE_MENU_CUSTOM_ID.afk,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "manage_afk" });

        try {
            const config = getConfig();

            if (!are_afk_channels_configured(config.AFK, config.logs)) {
                const draft = initAfkDraft(interaction.message.id, interaction.user.id);
                await interaction.editReply({
                    components: build_set_up_afk_embed(draft),
                    flags: MessageFlags.IsComponentsV2,
                });
                return;
            }

            await interaction.editReply({
                components: manage_afk_embed({
                    panel_channel: config.AFK.panel_channel,
                    afk_log: config.logs.afk_log,
                }),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to build/send AFK manage panel");
            await safeReply(interaction, error, "manage_afk.execute", interaction.id);
        }
    },
} satisfies Button;