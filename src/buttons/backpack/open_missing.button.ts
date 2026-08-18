import { ButtonInteraction, MessageFlags } from "discord.js";
import { Button } from "../../types";
import { requireManageGuild } from "../../utils/permissions/requireManageGuild";
import { metaBuilder } from "../../utils/logger/met_builder";
import { getConfig } from "../../utils/config/store";
import { safeReply } from "../../utils/safeReply.helper";
import { log } from "../../utils/logger";
import { get_family_members_without_backpack } from "../../utils/backpack/get_missing_backpack_members";
import { missing_backpack_embed, MISSING_BACKPACK_CUSTOM_IDS } from "../../embed/bacpack/missing.embed";

export default {
    customId: MISSING_BACKPACK_CUSTOM_IDS.open,
    deferUpdate: true,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.inCachedGuild()) return;

        if (!(await requireManageGuild(interaction))) return;

        const meta = metaBuilder(interaction.member, { button: "manage_backpack_missing" });

        try {
            const config = getConfig();

            const pageMatch = interaction.customId.match(/:page:(\d+)$/);
            const page = pageMatch ? parseInt(pageMatch[1], 10) : 0;

            const members = await get_family_members_without_backpack(interaction.guild, config);

            await interaction.editReply({
                components: missing_backpack_embed({ members, page }),
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            log.button.error(meta, "Failed to build/send missing-backpack list panel");
            await safeReply(interaction, error, "manage_backpack_missing.execute", interaction.id);
        }
    }
} satisfies Button;