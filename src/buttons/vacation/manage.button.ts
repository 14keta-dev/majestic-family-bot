import { ButtonInteraction, MessageFlags } from "discord.js";
import { MANAGE_MENU_CUSTOM_ID } from "../../embed/commands/menu.embed";
import { Button } from "../../types";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../utils/logger/met_builder";
import { log } from "../../utils/logger";
import { safeReply } from "../../utils/safeReply.helper";
import { getConfig } from "../../utils/config/store";
import { are_vacation_channels_configured } from "../../utils/vacation/is_configured";
import { initVacationDraft } from "../../utils/vacation/draft_store";
import { build_set_up_vacation_embed } from "../../embed/vacation/set_up.embed";
import { manage_vacation_embed } from "../../embed/vacation/manage.embed";

export default {
    customId: MANAGE_MENU_CUSTOM_ID.vacation,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "manage_vacation" });

        try {
            const config = getConfig();

            if (!are_vacation_channels_configured(config.vacation)) {
                const draft = initVacationDraft(interaction.message.id, interaction.user.id);
                await interaction.editReply({
                    components: build_set_up_vacation_embed(draft),
                    flags: MessageFlags.IsComponentsV2,
                });
                return;
            }

            await interaction.editReply({
                components: manage_vacation_embed(config.vacation),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to build/send vacation manage panel");
            await safeReply(interaction, error, "manage_vacation.execute", interaction.id);
        }
    },
} satisfies Button;